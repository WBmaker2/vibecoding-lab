import { describe, expect, it } from "vitest";
import { filterApps } from "./filter-apps";

const apps = [
  {
    id: "1",
    title: "Talking Vocab Quiz",
    summary: "영어 단어 퀴즈",
    tags: ["영어", "게임형"],
    subject: "영어",
    grade: "초등 4학년",
    memo: "짧은 형성평가에 적합"
  },
  {
    id: "2",
    title: "Class Random Seat",
    summary: "자리 배치 도구",
    tags: ["학급경영", "업무경감"],
    subject: "창체",
    grade: "",
    memo: ""
  }
];

describe("filterApps", () => {
  it("matches query across summary, tags, subject, grade, and memo", () => {
    expect(filterApps(apps, "형성평가", [])).toHaveLength(1);
    expect(filterApps(apps, "창체", [])).toHaveLength(1);
    expect(filterApps(apps, "영어", [])).toHaveLength(1);
  });

  it("requires all selected tags to match", () => {
    expect(filterApps(apps, "", ["학급경영", "업무경감"])).toHaveLength(1);
    expect(filterApps(apps, "", ["영어", "업무경감"])).toHaveLength(0);
  });
});
