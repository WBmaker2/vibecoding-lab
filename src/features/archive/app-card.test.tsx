import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { AppRecord } from "@/lib/apps/types";
import { AppCard } from "./app-card";

vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      src: string;
    }
  ) => {
    const imgProps = { ...props };
    delete imgProps.fill;
    const alt = imgProps.alt ?? "";
    delete imgProps.alt;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...imgProps} />
    );
  }
}));

const sampleApp: AppRecord = {
  id: "reading-timer",
  title: "Reading Timer",
  summary: "읽기 활동 시간을 관리하는 타이머",
  url: "https://example.com/reading-timer",
  tags: ["읽기", "영어"],
  thumbnailMode: "auto",
  thumbnailUrl: "https://example.com/thumb.png",
  subject: "영어",
  grade: "초등",
  memo: "",
  createdAt: new Date("2026-04-05T00:00:00.000Z"),
  updatedAt: new Date("2026-04-05T00:00:00.000Z")
};

describe("AppCard", () => {
  it("renders a thumbnail image when thumbnailUrl exists", () => {
    render(<AppCard app={sampleApp} />);

    expect(
      screen.getByRole("img", { name: "Reading Timer 썸네일" })
    ).toHaveAttribute("src", "https://example.com/thumb.png");
  });
});
