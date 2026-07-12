import type { PublicAppRecord } from "./types";
import { getRepresentativeTags } from "./representative-tags";

function app(id: string, tags: string[]): PublicAppRecord {
  return {
    id,
    title: id,
    summary: "테스트 앱",
    url: `https://example.com/${id}`,
    tags,
    thumbnailMode: "placeholder",
    thumbnailUrl: null,
    createdAt: new Date("2026-04-04T00:00:00.000Z"),
    updatedAt: new Date("2026-04-04T00:00:00.000Z")
  };
}

describe("getRepresentativeTags", () => {
  it("sorts by frequency, Korean label, and de-duplicates tags within one app", () => {
    const apps = [
      app("one", ["과학", "영어", "영어"]),
      app("two", ["수학", "과학"]),
      app("three", ["국어", "수학"]),
      app("four", ["국어"])
    ];

    expect(getRepresentativeTags(apps)).toEqual([
      "과학",
      "국어",
      "수학",
      "영어"
    ]);
  });

  it("caps the returned representative set at ten tags", () => {
    const tags = Array.from({ length: 12 }, (_, index) => `태그${index + 1}`);

    expect(getRepresentativeTags(tags.map((tag, index) => app(String(index), [tag])))).toHaveLength(10);
  });
});
