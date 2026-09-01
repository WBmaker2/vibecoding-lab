import { describe, expect, it } from "vitest";
import { createLlmsText } from "@/lib/seo/llms";
import type { PublicAppRecord } from "@/lib/apps/types";
import { GET } from "./route";

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

describe("llms.txt route", () => {
  it("renders a concise site guide and every app detail link", () => {
    const text = createLlmsText([app], "https://example.com");

    expect(text).toContain("# Hong's Vibe Coding Lab");
    expect(text).toContain("## 앱 목록");
    expect(text).toContain(
      "[PDF to PNG 1080p](https://example.com/apps/pdf-to-png-1080p-b5c444ba-0d76-4bc5-b787-3132985da0d3)"
    );
    expect(text).toContain("수정일 2026-07-23");
    expect(text).toContain("검색 노출이나 AI 인용을 보장하지 않습니다.");
    expect(text).toContain(
      "사실을 인용할 때는 해당 앱의 상세 URL(https://example.com/apps/...)"
    );
  });

  it("serves plain text with a cache-safe response", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("must-revalidate");
    expect(await response.text()).toContain("# Hong's Vibe Coding Lab");
  });
});
