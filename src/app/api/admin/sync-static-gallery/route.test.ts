import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAppRepositoryMock,
  getStaticGalleryBaselineMock,
  getStaticGallerySyncSummaryMock,
  hasAdminSessionMock,
  listAdminAppsMock
} = vi.hoisted(() => ({
  getAppRepositoryMock: vi.fn(),
  getStaticGalleryBaselineMock: vi.fn(),
  getStaticGallerySyncSummaryMock: vi.fn(),
  hasAdminSessionMock: vi.fn(),
  listAdminAppsMock: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  hasAdminSession: hasAdminSessionMock
}));

vi.mock("@/lib/apps/repository", () => ({
  getAppRepository: getAppRepositoryMock
}));

vi.mock("@/lib/apps/static-public-apps", () => ({
  getStaticGalleryBaseline: getStaticGalleryBaselineMock
}));

vi.mock("@/lib/apps/static-gallery-sync-state", () => ({
  ACTIVE_WORKFLOW_STATUSES: new Set([
    "queued",
    "in_progress",
    "waiting",
    "requested",
    "pending"
  ]),
  getStaticGallerySyncSummary: getStaticGallerySyncSummaryMock
}));

import { GET, POST } from "./route";

const originalEnv = { ...process.env };
const summary = {
  pendingCount: 2,
  dbCount: 2,
  snapshotCount: 1,
  generatedAt: "2026-07-10T00:00:00.000Z"
};

function request(method: "GET" | "POST" = "POST") {
  return new Request("http://localhost/api/admin/sync-static-gallery", {
    method,
    body: method === "POST" ? JSON.stringify({ reason: "button click" }) : undefined
  });
}

describe("/api/admin/sync-static-gallery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hasAdminSessionMock.mockReset();
    getAppRepositoryMock.mockReset();
    getStaticGalleryBaselineMock.mockReset();
    getStaticGallerySyncSummaryMock.mockReset();
    listAdminAppsMock.mockReset();
    process.env = { ...originalEnv };
    delete process.env.HVC_SYNC_GITHUB_TOKEN;
    delete process.env.HVC_SYNC_GITHUB_OWNER;
    delete process.env.HVC_SYNC_GITHUB_REPO;
    delete process.env.HVC_SYNC_GITHUB_WORKFLOW_ID;
    delete process.env.HVC_SYNC_GITHUB_REF;
    delete process.env.HVC_SYNC_BASE_URL;
    getAppRepositoryMock.mockReturnValue({ listAdminApps: listAdminAppsMock });
    listAdminAppsMock.mockResolvedValue([]);
    getStaticGalleryBaselineMock.mockReturnValue({
      generatedAt: summary.generatedAt,
      appCount: 1,
      updatedAtById: {}
    });
    getStaticGallerySyncSummaryMock.mockReturnValue(summary);
  });

  it("rejects unauthenticated GET before repository or GitHub work", async () => {
    hasAdminSessionMock.mockResolvedValue(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getAppRepositoryMock).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns only normalized fields for the latest workflow run", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              id: 123,
              status: "completed",
              conclusion: "success",
              html_url: "https://github.com/WBmaker2/vibecoding-lab/actions/runs/123",
              created_at: "2026-07-10T01:00:00.000Z",
              updated_at: "2026-07-10T01:02:00.000Z",
              run_attempt: 4,
              token: "must-not-leak"
            }
          ]
        }),
        { status: 200 }
      )
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      run: {
        id: 123,
        status: "completed",
        conclusion: "success",
        htmlUrl:
          "https://github.com/WBmaker2/vibecoding-lab/actions/runs/123",
        createdAt: "2026-07-10T01:00:00.000Z",
        updatedAt: "2026-07-10T01:02:00.000Z"
      }
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/WBmaker2/vibecoding-lab/actions/workflows/sync-static-gallery.yml/runs?branch=codex%2Fhongs-vibe-coding-lab&event=workflow_dispatch&per_page=1",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          authorization: "Bearer test-token"
        })
      })
    );
  });

  it("returns a no-op without reading configuration or calling GitHub", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    getStaticGallerySyncSummaryMock.mockReturnValue({
      ...summary,
      pendingCount: 0
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ dispatched: false });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(listAdminAppsMock).toHaveBeenCalledOnce();
  });

  it("rejects a changed request when the latest workflow run is active", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const activeRun = {
      id: 456,
      status: "in_progress",
      conclusion: null,
      htmlUrl: "https://github.com/WBmaker2/vibecoding-lab/actions/runs/456",
      createdAt: "2026-07-10T02:00:00.000Z",
      updatedAt: "2026-07-10T02:01:00.000Z"
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ workflow_runs: [
        {
          id: activeRun.id,
          status: activeRun.status,
          conclusion: activeRun.conclusion,
          html_url: activeRun.htmlUrl,
          created_at: activeRun.createdAt,
          updated_at: activeRun.updatedAt
        }
      ] }), { status: 200 })
    );

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "이미 실행 중인 동기화 작업이 있습니다.",
      run: activeRun
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("dispatches changed work only after an idle latest-run check", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ dispatched: true });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/WBmaker2/vibecoding-lab/actions/workflows/sync-static-gallery.yml/dispatches",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-token"
        })
      })
    );
  });
});
