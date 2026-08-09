import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn()
}));

vi.mock("@/db/turso-client", () => ({
  getTursoClient: () => ({ execute: executeMock })
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
  });

  it("passes both timestamps when creating an app", async () => {
    executeMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] });

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
});
