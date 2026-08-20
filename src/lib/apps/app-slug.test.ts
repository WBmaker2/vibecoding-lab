import type { PublicAppRecord } from "./types";
import {
  createAppPath,
  createAppSlug,
  findAppBySlug,
  getAppIdFromSlug
} from "./app-slug";

const app: PublicAppRecord = {
  id: "b5c444ba-0d76-4bc5-b787-3132985da0d3",
  title: "선생님의 AI 영어 사전",
  summary: "영어 사전",
  url: "https://example.com/dictionary",
  tags: ["영어", "사전"],
  thumbnailMode: "auto",
  thumbnailUrl: null,
  createdAt: new Date("2026-04-04T00:00:00.000Z"),
  updatedAt: new Date("2026-08-20T00:00:00.000Z")
};

describe("app slug helpers", () => {
  it("combines an ASCII-safe title and URL hint with the complete UUID", () => {
    expect(createAppSlug(app)).toBe(
      "ai-dictionary-b5c444ba-0d76-4bc5-b787-3132985da0d3"
    );
    expect(createAppPath(app)).toBe(
      "/apps/ai-dictionary-b5c444ba-0d76-4bc5-b787-3132985da0d3"
    );
    expect(createAppSlug(app)).toMatch(/^[a-z0-9-]+$/);
  });

  it("finds the same app from an old title segment by its UUID", () => {
    const staleSlug = `예전-제목-${app.id}`;

    expect(getAppIdFromSlug(staleSlug)).toBe(app.id);
    expect(findAppBySlug([app], staleSlug)).toBe(app);
  });

  it("returns undefined for unknown or malformed slugs", () => {
    expect(findAppBySlug([app], "not-an-app")).toBeUndefined();
    expect(getAppIdFromSlug("not-an-app")).toBeNull();
  });
});
