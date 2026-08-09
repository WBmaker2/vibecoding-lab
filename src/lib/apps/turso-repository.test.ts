import { beforeEach, describe, expect, it, vi } from "vitest";

const { batchMock, client, executeMock } = vi.hoisted(() => {
  const executeMock = vi.fn();
  const batchMock = vi.fn();

  return {
    batchMock,
    client: { batch: batchMock, execute: executeMock },
    executeMock
  };
});

vi.mock("@/db/turso-client", () => ({
  getTursoClient: () => client
}));

import { TursoAppRepository } from "./turso-repository";

const row = {
  id: "app-1",
  title: "Turso 테스트 앱",
  summary: "Turso 저장소 등록 테스트",
  url: "https://example.com/turso-test",
  github_url: null,
  tags: '["turso", "test"]',
  thumbnail_mode: "placeholder",
  thumbnail_url: null,
  subject: "공통",
  grade: null,
  memo: null,
  subjects: '["공통"]',
  grade_bands: "[]",
  audience: null,
  interaction_type: null,
  learning_process: "[]",
  created_at: "2026-08-09T00:00:00.000Z",
  updated_at: "2026-08-09T00:00:00.000Z"
};

describe("TursoAppRepository", () => {
  beforeEach(() => {
    executeMock.mockReset();
    batchMock.mockReset();
    batchMock.mockResolvedValue([]);
  });

  it("passes both timestamps when creating an app", async () => {
    executeMock.mockResolvedValueOnce({ rows: [row] });

    const repository = new TursoAppRepository();
    const created = await repository.createApp({
      title: row.title,
      summary: row.summary,
      url: row.url,
      tags: ["turso", "test"],
      thumbnailMode: "placeholder",
      subject: row.subject
    });
    const insertCall = executeMock.mock.calls[0][0] as {
      args: unknown[];
    };

    expect(created.id).toBe(row.id);
    expect(insertCall.args).toHaveLength(18);
    expect(insertCall.args.at(-1)).toBe(insertCall.args.at(-2));
  });

  it("updates one app without a follow-up read", async () => {
    executeMock.mockResolvedValueOnce({ rows: [row] });

    const repository = new TursoAppRepository();
    const updated = await repository.updateApp(row.id, {
      title: "수정된 앱",
      summary: row.summary,
      url: row.url,
      tags: ["turso"],
      thumbnailMode: "placeholder"
    });

    expect(updated.id).toBe(row.id);
    expect(executeMock).toHaveBeenCalledTimes(2);
    expect(executeMock.mock.calls[0][0].sql).toContain("RETURNING");
    expect(executeMock.mock.calls[1][0].sql).toContain(
      "UPDATE app_catalog_state"
    );
  });

  it("reads the catalog revision from one state row", async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ revision: 7 }] });

    const repository = new TursoAppRepository();

    await expect(repository.getCatalogRevision()).resolves.toBe(7);
    expect(executeMock).toHaveBeenCalledOnce();
    expect(executeMock.mock.calls[0][0].sql).toContain(
      "FROM app_catalog_state"
    );
  });
});
