import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { PublicAppRecord } from "@/lib/apps/types";
import { AppCard } from "./app-card";

const imageMock = vi.fn();

vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      src: string;
    }
  ) => {
    imageMock(props);
    const imgProps = { ...props };
    delete imgProps.fill;
    delete imgProps.unoptimized;
    const alt = imgProps.alt ?? "";
    delete imgProps.alt;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...imgProps} />
    );
  }
}));

const sampleApp: PublicAppRecord = {
  id: "reading-timer",
  title: "Reading Timer",
  summary: "읽기 활동 시간을 관리하는 타이머",
  url: "https://example.com/reading-timer",
  tags: ["읽기", "영어"],
  thumbnailMode: "auto",
  thumbnailUrl: "/api/app-thumbnail/reading-timer/1777800000000",
  subject: "영어",
  grade: "초등",
  memo: "읽기 루틴 도입용으로 쓰기 좋습니다.",
  createdAt: new Date("2026-04-05T00:00:00.000Z"),
  updatedAt: new Date("2026-04-05T00:00:00.000Z")
};

describe("AppCard", () => {
  beforeEach(() => {
    imageMock.mockClear();
  });

  it("renders a thumbnail image, compact submeta, and primary CTA", () => {
    render(<AppCard app={sampleApp} />);

    expect(
      screen.getByRole("img", { name: "Reading Timer 썸네일" })
    ).toHaveAttribute("src", "/api/app-thumbnail/reading-timer/1777800000000");
    expect(screen.getByText("영어 · 초등")).toBeInTheDocument();
    expect(screen.getByText("메이커 노트")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "앱 열기" })).toHaveAttribute(
      "href",
      "https://example.com/reading-timer"
    );
    expect(imageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        src: "/api/app-thumbnail/reading-timer/1777800000000",
        unoptimized: true
      })
    );
  });
});
