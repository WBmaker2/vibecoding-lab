import { describe, expect, it } from "vitest";
import type { ArchiveFilterOptions } from "./archive-filter-options";
import {
  readArchiveUrlState,
  writeArchiveUrlState
} from "./archive-url-state";

const options: ArchiveFilterOptions = {
  audiences: [
    { value: "all", count: 4 },
    { value: "student", count: 2 },
    { value: "teacher", count: 1 },
    { value: "mixed", count: 1 }
  ],
  gradeBands: [{ value: "5-6", count: 2 }],
  interactionTypes: [{ value: "simulation", count: 2 }],
  subjects: [{ value: "과학", count: 2 }]
};

describe("archive URL state", () => {
  it("writes filters, saved view, sorting, and page into a shareable query", () => {
    expect(
      writeArchiveUrlState({
        activeTags: ["실험"],
        audience: "teacher",
        gradeBands: ["5-6"],
        interactionTypes: ["simulation"],
        page: 2,
        query: "과학 5학년",
        recentOnly: true,
        savedOnly: true,
        selectedSubjects: ["과학"],
        sort: "updated"
      })
    ).toBe(
      "?q=%EA%B3%BC%ED%95%99+5%ED%95%99%EB%85%84&tag=%EC%8B%A4%ED%97%98&subject=%EA%B3%BC%ED%95%99&grade=5-6&interaction=simulation&audience=teacher&recent=1&saved=1&sort=updated&page=2"
    );
  });

  it("restores only known structured values and deduplicates lists", () => {
    expect(
      readArchiveUrlState(
        "?q=%EA%B3%BC%ED%95%99+5%ED%95%99%EB%85%84&tag=%EC%8B%A4%ED%97%98&tag=%EC%8B%A4%ED%97%98&subject=%EA%B3%BC%ED%95%99&subject=%EC%97%AD%EC%82%AC&grade=5-6&grade=secondary&interaction=simulation&interaction=utility&audience=teacher&recent=1&saved=1&page=0&sort=updated",
        options
      )
    ).toEqual({
      activeTags: ["실험"],
      audience: "teacher",
      gradeBands: ["5-6"],
      interactionTypes: ["simulation"],
      page: 1,
      query: "과학 5학년",
      recentOnly: true,
      savedOnly: true,
      selectedSubjects: ["과학"],
      sort: "updated"
    });
  });
});
