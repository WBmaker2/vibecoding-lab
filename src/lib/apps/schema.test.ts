import { describe, expect, it } from "vitest";
import { appInputSchema } from "./schema";

describe("appInputSchema", () => {
  it("accepts multiple tags and optional public fields", () => {
    const parsed = appInputSchema.parse({
      title: "Class Random Seat",
      summary: "학급 자리 배치 도구",
      url: "https://example.com",
      tags: ["학급경영", "업무경감"],
      githubUrl: "https://github.com/WBmaker2/class-random-seat",
      subject: "창체",
      grade: "초등 5학년",
      memo: "교실 화면 공유에 적합",
      thumbnailMode: "placeholder"
    });

    expect(parsed.tags).toHaveLength(2);
    expect(parsed.githubUrl).toBe(
      "https://github.com/WBmaker2/class-random-seat"
    );
    expect(parsed.memo).toBe("교실 화면 공유에 적합");
  });

  it("stores tags without leading hashtag markers", () => {
    const parsed = appInputSchema.parse({
      title: "Teacher Helper",
      summary: "업무를 줄여주는 교사용 도구",
      url: "https://example.com/helper",
      tags: ["#업무경감", "##수업준비", "  #영어  "],
      thumbnailMode: "placeholder"
    });

    expect(parsed.tags).toEqual(["업무경감", "수업준비", "영어"]);
  });

  it("keeps optional public fields empty when not provided", () => {
    const parsed = appInputSchema.parse({
      title: "Worksheet Toolkit",
      summary: "활동지 보조 도구",
      url: "https://example.com/toolkit",
      tags: ["업무경감"],
      thumbnailMode: "placeholder"
    });

    expect(parsed.subject).toBeUndefined();
    expect(parsed.grade).toBeUndefined();
    expect(parsed.memo).toBeUndefined();
    expect(parsed.githubUrl).toBeUndefined();
  });

  it("rejects empty required fields", () => {
    expect(() =>
      appInputSchema.parse({
        title: "",
        summary: "",
        url: "not-a-url",
        tags: [],
        thumbnailMode: "placeholder"
      })
    ).toThrow();
  });

  it("rejects non-github urls for the optional github field", () => {
    expect(() =>
      appInputSchema.parse({
        title: "Worksheet Toolkit",
        summary: "활동지 보조 도구",
        url: "https://example.com/toolkit",
        githubUrl: "https://notgithub.com/toolkit",
        tags: ["업무경감"],
        thumbnailMode: "placeholder"
      })
    ).toThrow();
  });

  it("rejects empty data-url thumbnails that would render as broken images", () => {
    expect(() =>
      appInputSchema.parse({
        title: "PDF to PNG 1080p",
        summary: "PDF를 PNG로 변환하는 도구",
        url: "https://wbmaker2.github.io/pdf-to-png/",
        tags: ["PDF", "업무"],
        thumbnailMode: "auto",
        thumbnailUrl: "data:,"
      })
    ).toThrow();
  });
});
