import { describe, expect, it } from "vitest";
import type { PublicAppRecord } from "@/lib/apps/types";
import { getArchiveFilterOptions } from "./archive-filter-options";

function makeApp(
  id: string,
  grade: string,
  gradeBands?: PublicAppRecord["gradeBands"]
): PublicAppRecord {
  const date = new Date("2026-04-05T00:00:00.000Z");
  return {
    id,
    title: id,
    summary: "수업 앱",
    url: `https://example.com/${id}`,
    tags: ["수업"],
    thumbnailMode: "placeholder",
    thumbnailUrl: null,
    grade,
    gradeBands,
    createdAt: date,
    updatedAt: date
  };
}

describe("archive filter options", () => {
  it("counts an all-elementary app in each elementary grade filter", () => {
    const options = getArchiveFilterOptions([
      makeApp("all", "전학년", ["all"]),
      makeApp("upper", "초등 5학년", ["5-6"])
    ]);

    expect(options.gradeBands).toEqual(
      expect.arrayContaining([
        { value: "1-2", count: 1 },
        { value: "3-4", count: 1 },
        { value: "5-6", count: 2 },
        { value: "all", count: 1 }
      ])
    );
  });
});
