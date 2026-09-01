import { describe, expect, it } from "vitest";
import type { PublicAppRecord } from "./types";
import { createAppFaqItems } from "./app-faq";

const app: PublicAppRecord = {
  id: "b5c444ba-0d76-4bc5-b787-3132985da0d3",
  title: "PDF to PNG 1080p",
  summary: "PDF를 PNG 이미지로 변환하는 교사용 도구",
  url: "https://example.com/pdf-tool",
  tags: ["PDF", "업무"],
  thumbnailMode: "placeholder",
  thumbnailUrl: null,
  subject: "공통",
  grade: "교사용",
  audience: "teacher",
  interactionType: "utility",
  learningProcess: ["변환", "확인", "저장"],
  memo: "학습지와 안내문을 이미지로 나눌 때 사용합니다.",
  createdAt: new Date("2026-05-03T09:33:29.709Z"),
  updatedAt: new Date("2026-07-23T09:14:28.416Z")
};

describe("createAppFaqItems", () => {
  it("builds visible, factual questions from the app record", () => {
    expect(createAppFaqItems(app)).toEqual([
      {
        question: "PDF to PNG 1080p은 무엇인가요?",
        answer: app.summary
      },
      {
        question: "PDF to PNG 1080p는 누구를 위한 앱인가요?",
        answer: "대상은 교사입니다."
      },
      {
        question: "PDF to PNG 1080p는 어떤 교과·주제를 다루나요?",
        answer: "이 앱은 공통 관련 활동을 다룹니다."
      },
      {
        question: "PDF to PNG 1080p를 어떻게 활용하나요?",
        answer:
          "활동 순서는 변환 → 확인 → 저장입니다. 학습지와 안내문을 이미지로 나눌 때 사용합니다."
      }
    ]);
  });

  it("does not invent optional facts when the record is sparse", () => {
    const sparse = { ...app, audience: undefined, grade: undefined, subject: undefined, memo: undefined, learningProcess: [] };
    expect(createAppFaqItems(sparse)).toEqual([
      {
        question: "PDF to PNG 1080p은 무엇인가요?",
        answer: app.summary
      }
    ]);
  });
});
