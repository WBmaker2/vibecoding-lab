import type { PublicAppRecord } from "./types";
import { getRelatedApps } from "./related-apps";

function makeApp(
  id: string,
  title: string,
  tags: string[],
  subject = "공통"
): PublicAppRecord {
  return {
    id,
    title,
    summary: `${title} 설명`,
    url: `https://example.com/${id}`,
    tags,
    thumbnailMode: "placeholder",
    thumbnailUrl: null,
    subject,
    subjects: [subject],
    gradeBands: [],
    audience: "teacher",
    interactionType: "utility",
    learningProcess: ["확인"],
    createdAt: new Date("2026-04-04T00:00:00.000Z"),
    updatedAt: new Date("2026-08-20T00:00:00.000Z")
  };
}

describe("getRelatedApps", () => {
  it("ranks tag and subject matches, excludes the current app, and applies a limit", () => {
    const current = makeApp("current", "현재 앱", ["영어", "퀴즈"], "영어");
    const close = makeApp("close", "가까운 앱", ["영어", "퀴즈"], "영어");
    const tagOnly = makeApp("tag", "태그 앱", ["퀴즈"], "수학");
    const subjectOnly = makeApp("subject", "교과 앱", ["사전"], "영어");
    const unrelated = makeApp("other", "무관 앱", ["행정"], "공통");

    expect(
      getRelatedApps(current, [current, tagOnly, unrelated, subjectOnly, close], 2).map(
        (candidate) => candidate.id
      )
    ).toEqual(["close", "tag"]);
  });
});
