import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { PublicAppRecord } from "@/lib/apps/types";
import { AppCard } from "./app-card";

const sampleApp: PublicAppRecord = {
  id: "b5c444ba-0d76-4bc5-b787-3132985da0d3",
  title: "Reading Timer",
  summary: "읽기 활동 시간을 관리하는 타이머",
  url: "https://example.com/reading-timer",
  tags: ["읽기", "영어"],
  thumbnailMode: "auto",
  thumbnailUrl: "/app-thumbnails/reading-timer.webp",
  subject: "영어",
  grade: "초등",
  memo: "읽기 루틴 도입용으로 쓰기 좋습니다.",
  createdAt: new Date("2026-04-05T00:00:00.000Z"),
  updatedAt: new Date("2026-04-05T00:00:00.000Z")
};

describe("AppCard", () => {
  it("renders a thumbnail image, compact submeta, and primary CTA", () => {
    render(<AppCard app={sampleApp} />);

    expect(
      screen.getByRole("img", { name: "Reading Timer 썸네일" })
    ).toHaveAttribute("src", "/app-thumbnails/reading-timer.webp");
    expect(
      screen.getByRole("img", { name: "Reading Timer 썸네일" })
    ).toHaveAttribute("loading", "lazy");
    expect(
      screen.getByRole("img", { name: "Reading Timer 썸네일" })
    ).toHaveAttribute("decoding", "async");
    expect(
      screen.getByRole("img", { name: "Reading Timer 썸네일" })
    ).toHaveAttribute("referrerPolicy", "no-referrer");
    expect(screen.getByText("영어 · 초등")).toBeInTheDocument();
    expect(screen.getByText("메이커 노트")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reading Timer 자세히 보기" })).toHaveAttribute(
      "href",
      "/apps/reading-timer-b5c444ba-0d76-4bc5-b787-3132985da0d3"
    );
    expect(
      screen.getByRole("link", { name: "Reading Timer 앱 새 창에서 열기" })
    ).toHaveAttribute(
      "href",
      "https://example.com/reading-timer"
    );
  });

  it("shows four tags and a compact overflow count", () => {
    render(
      <AppCard
        app={{
          ...sampleApp,
          tags: ["읽기", "영어", "교실", "활동", "초등", "타이머"]
        }}
      />
    );

    const tagList = screen.getByLabelText("Reading Timer 태그");

    expect(tagList).toHaveTextContent("#읽기");
    expect(tagList).toHaveTextContent("#영어");
    expect(tagList).toHaveTextContent("#교실");
    expect(tagList).toHaveTextContent("#활동");
    expect(tagList).toHaveTextContent("+2");
    expect(tagList).not.toHaveTextContent("#초등");
    expect(tagList).not.toHaveTextContent("#타이머");
  });

  it("keeps the archive query when opening details and exposes a save action", () => {
    const onToggleFavorite = vi.fn();
    const onRecordUse = vi.fn();
    const returnSearch = "?q=%EC%98%81%EC%96%B4&page=2";
    render(
      <AppCard
        app={sampleApp}
        isFavorite
        onRecordUse={onRecordUse}
        onToggleFavorite={onToggleFavorite}
        returnSearch={returnSearch}
      />
    );

    expect(screen.getByRole("link", { name: "Reading Timer 자세히 보기" })).toHaveAttribute(
      "href",
      `/apps/reading-timer-b5c444ba-0d76-4bc5-b787-3132985da0d3?return_to=${encodeURIComponent(
        `/${returnSearch}`
      )}`
    );
    const saveButton = screen.getByRole("button", { name: "Reading Timer 보관함에서 제거" });
    expect(saveButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(saveButton);
    expect(onToggleFavorite).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("link", { name: "Reading Timer 앱 새 창에서 열기" }));
    expect(onRecordUse).toHaveBeenCalledWith(sampleApp.id);
  });
});
