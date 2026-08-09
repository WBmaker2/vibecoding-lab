import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicAppRecord } from "./types";

const mocks = vi.hoisted(() => ({
  getStaticGalleryAssetIntegrity: vi.fn(),
  getStaticGalleryBaseline: vi.fn(),
  listStaticPublicApps: vi.fn(),
  listAdminApps: vi.fn()
}));

vi.mock("@/lib/apps/static-gallery-asset-integrity", () => ({
  getStaticGalleryAssetIntegrity: mocks.getStaticGalleryAssetIntegrity
}));

vi.mock("@/lib/apps/static-public-apps", () => ({
  getStaticGalleryBaseline: mocks.getStaticGalleryBaseline,
  listStaticPublicApps: mocks.listStaticPublicApps
}));

vi.mock("./repository", () => ({
  getAppRepository: () => ({ listAdminApps: mocks.listAdminApps })
}));

import {
  getAdminDatabaseFallbackReason,
  loadAdminPageData,
  toStaticAdminFallbackApps
} from "./admin-page-data";

const baseline = {
  generatedAt: "2026-08-09T00:00:00.000Z",
  appCount: 1,
  updatedAtById: { "app-1": "2026-08-08T00:00:00.000Z" }
};

const assetIntegrity = {
  valid: true,
  reason: "assets-match"
};

function publicApp(): PublicAppRecord {
  return {
    id: "app-1",
    title: "정적 스냅샷 앱",
    summary: "공개 목록에서 읽은 테스트 앱",
    url: "https://example.com/app-1",
    tags: ["수업", "업무"],
    thumbnailMode: "upload",
    thumbnailUrl: "/app-thumbnails/app-1.png",
    subject: "공통",
    grade: "전 학년",
    memo: "공개 메모",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-08T00:00:00.000Z")
  };
}

describe("admin page data loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStaticGalleryBaseline.mockReturnValue(baseline);
    mocks.getStaticGalleryAssetIntegrity.mockResolvedValue(assetIntegrity);
  });

  it("returns database apps when the admin query succeeds", async () => {
    const databaseApp = { ...publicApp(), githubUrl: "https://github.com/example/app-1" };
    mocks.listAdminApps.mockResolvedValue([databaseApp]);

    await expect(loadAdminPageData()).resolves.toEqual({
      apps: [databaseApp],
      assetIntegrity,
      baseline,
      dataSource: { kind: "database" }
    });
  });

  it("uses the public snapshot when the database quota is exceeded", async () => {
    const quotaError = new Error("Failed query", {
      cause: new Error("Your project has exceeded the data transfer quota.")
    });
    mocks.listAdminApps.mockRejectedValue(quotaError);
    mocks.listStaticPublicApps.mockReturnValue([publicApp()]);

    const result = await loadAdminPageData();

    expect(result.apps).toEqual([{ ...publicApp(), githubUrl: undefined }]);
    expect(result.dataSource).toEqual({
      kind: "static-fallback",
      reason: "연결된 Postgres DB의 데이터 전송량 한도를 초과해 앱 목록을 읽지 못했습니다."
    });
    expect(result.baseline).toBe(baseline);
    expect(result.assetIntegrity).toBe(assetIntegrity);
  });

  it("keeps public fallback records read-only by removing GitHub admin data", () => {
    const app = { ...publicApp(), githubUrl: "https://github.com/example/app-1" };

    expect(toStaticAdminFallbackApps([app])).toEqual([
      { ...publicApp(), githubUrl: undefined }
    ]);
  });

  it("returns a generic fallback reason for other database failures", () => {
    expect(getAdminDatabaseFallbackReason(new Error("connection refused"))).toBe(
      "관리자 DB를 읽지 못해 공개 정적 스냅샷으로 대신 표시합니다."
    );
  });
});
