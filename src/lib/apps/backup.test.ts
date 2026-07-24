import type { AdminAppRecord } from "@/lib/apps/types";
import { createAppsBackupPayload } from "./backup";

const sampleApps: AdminAppRecord[] = [
  {
    id: "app-1",
    title: "영어 단어 게임",
    summary: "영어 단어를 빠르게 복습하는 수업용 앱",
    url: "https://example.com/word-game",
    githubUrl: "https://github.com/WBmaker2/word-game",
    tags: ["영어", "게임형"],
    thumbnailMode: "auto",
    thumbnailUrl: "https://example.com/thumb.png",
    subject: "영어",
    grade: "초등 5학년",
    memo: "짧은 복습 시간에 좋습니다.",
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T01:30:00.000Z")
  }
];

describe("createAppsBackupPayload", () => {
  it("serializes app records into a versioned JSON backup payload", () => {
    const payload = createAppsBackupPayload(
      sampleApps,
      new Date("2026-04-06T12:00:00.000Z")
    );

    expect(payload.version).toBe(1);
    expect(payload.appCount).toBe(1);
    expect(payload.generatedAt).toBe("2026-04-06T12:00:00.000Z");
    expect(payload.apps).toEqual([
      {
        id: "app-1",
        title: "영어 단어 게임",
        summary: "영어 단어를 빠르게 복습하는 수업용 앱",
        url: "https://example.com/word-game",
        githubUrl: "https://github.com/WBmaker2/word-game",
        tags: ["영어", "게임형"],
        thumbnailMode: "auto",
        thumbnailUrl: "https://example.com/thumb.png",
        subject: "영어",
        grade: "초등 5학년",
        memo: "짧은 복습 시간에 좋습니다.",
        subjects: ["영어"],
        gradeBands: ["5-6"],
        audience: "student",
        interactionType: "practice",
        learningProcess: ["문제 해결", "피드백", "반복"],
        createdAt: "2026-04-05T00:00:00.000Z",
        updatedAt: "2026-04-05T01:30:00.000Z"
      }
    ]);
  });
});
