import { render, screen } from "@testing-library/react";
import type { PublicAppRecord } from "@/lib/apps/types";
import { AppDetailPage } from "./app-detail-page";

const app: PublicAppRecord = {
  id: "b5c444ba-0d76-4bc5-b787-3132985da0d3",
  title: "PDF to PNG 1080p",
  summary: "PDF를 PNG 이미지로 변환하는 교사용 도구",
  url: "https://example.net/pdf-tool",
  tags: ["PDF", "업무"],
  thumbnailMode: "upload",
  thumbnailUrl: "/app-thumbnails/sample.png",
  subject: "공통",
  grade: "교사용",
  memo: "학습지와 안내문을 이미지로 나눌 때 사용합니다.",
  createdAt: new Date("2026-05-03T09:33:29.709Z"),
  updatedAt: new Date("2026-07-23T09:14:28.416Z")
};

const relatedApp: PublicAppRecord = {
  ...app,
  id: "0118a475-a6af-4be2-849e-416bcd2e9ee8",
  title: "관련 업무 도구",
  summary: "교사 업무를 빠르게 정리하는 관련 도구",
  url: "https://example.net/related"
};

describe("AppDetailPage", () => {
  it("shows the complete app information, primary CTA, and related internal link", () => {
    render(<AppDetailPage app={app} relatedApps={[relatedApp]} />);

    expect(screen.getByRole("heading", { level: 1, name: app.title })).toBeInTheDocument();
    expect(screen.getByText(app.summary)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `${app.title} 미리보기` })).toHaveAttribute(
      "src",
      app.thumbnailUrl
    );
    expect(screen.getByText("공통 · 교사용")).toBeInTheDocument();
    expect(screen.getByText("#PDF")).toBeInTheDocument();
    expect(screen.getByText(app.memo!)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${app.title} 앱 열기` })).toHaveAttribute(
      "href",
      app.url
    );
    expect(screen.getByRole("link", { name: relatedApp.title })).toHaveAttribute(
      "href",
      expect.stringContaining("/apps/")
    );
    expect(screen.getByRole("button", { name: "업데이트 내역" })).toBeInTheDocument();
  });
});
