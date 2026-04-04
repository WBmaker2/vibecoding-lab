import { describe, expect, it } from "vitest";
import { appInputSchema } from "./schema";

describe("appInputSchema", () => {
  it("accepts multiple tags and optional public fields", () => {
    const parsed = appInputSchema.parse({
      title: "Class Random Seat",
      summary: "학급 자리 배치 도구",
      url: "https://example.com",
      tags: ["학급경영", "업무경감"],
      subject: "창체",
      grade: "초등 5학년",
      memo: "교실 화면 공유에 적합",
      thumbnailMode: "placeholder"
    });

    expect(parsed.tags).toHaveLength(2);
    expect(parsed.memo).toBe("교실 화면 공유에 적합");
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
});
