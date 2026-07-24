import { describe, expect, it } from "vitest";
import { normalizeAppMetadata } from "./metadata";

describe("normalizeAppMetadata", () => {
  it("splits mixed subject separators and removes the fusion suffix", () => {
    expect(normalizeAppMetadata({ subject: "사회/수학 융합" }).subjects).toEqual([
      "사회",
      "수학"
    ]);
    expect(normalizeAppMetadata({ subject: "체육・안전" }).subjects).toEqual([
      "체육",
      "안전"
    ]);
  });

  it("normalizes elementary grade variants into stable bands", () => {
    expect(normalizeAppMetadata({ grade: "초등 3~6학년" }).gradeBands).toEqual([
      "3-4",
      "5-6"
    ]);
    expect(normalizeAppMetadata({ grade: "전 학년" }).gradeBands).toEqual([
      "all"
    ]);
    expect(normalizeAppMetadata({ grade: "교사용" }).gradeBands).toEqual([
      "teacher"
    ]);
  });

  it("preserves explicit structured metadata and normalizes duplicates", () => {
    const metadata = normalizeAppMetadata({
      subjects: ["수학", "수학", " 미술 "],
      gradeBands: ["5-6", "5-6"],
      audience: "mixed",
      interactionType: "creation",
      learningProcess: ["구상", "제작", "구상"]
    });

    expect(metadata).toEqual({
      subjects: ["수학", "미술"],
      gradeBands: ["5-6"],
      audience: "mixed",
      interactionType: "creation",
      learningProcess: ["구상", "제작"]
    });
  });

  it("infers teacher management metadata from legacy fields", () => {
    const metadata = normalizeAppMetadata({
      title: "담임 행정 허브",
      summary: "담임교사가 공문과 마감을 관리하는 도구",
      subject: "공통",
      tags: ["담임", "업무"]
    });

    expect(metadata.audience).toBe("teacher");
    expect(metadata.interactionType).toBe("management");
    expect(metadata.learningProcess).toEqual(["기록", "정리", "확인"]);
  });
});
