import { fireEvent, render, screen, within } from "@testing-library/react";
import type { PublicAppRecord } from "@/lib/apps/types";
import { ArchivePage } from "./archive-page";

const sampleApps: PublicAppRecord[] = [
  {
    id: "talking-vocab-quiz",
    title: "Talking Vocab Quiz",
    summary: "영어 단어 퀴즈",
    url: "https://example.com/talking-vocab-quiz",
    tags: ["영어", "게임형", "형성평가"],
    thumbnailMode: "auto",
    thumbnailUrl: "",
    subject: "영어",
    grade: "초등 4학년",
    memo: "짧은 형성평가에 적합",
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z")
  },
  {
    id: "class-random-seat",
    title: "Class Random Seat",
    summary: "자리 배치 도구",
    url: "https://example.com/class-random-seat",
    tags: ["학급경영", "업무경감", "랜덤"],
    thumbnailMode: "auto",
    thumbnailUrl: "",
    subject: "창체",
    grade: "전학년",
    memo: "",
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z")
  }
];

describe("ArchivePage", () => {
  it("shows active filter state and clears it from the results bar", () => {
    render(<ArchivePage initialApps={sampleApps} />);

    fireEvent.click(screen.getByRole("button", { name: "#영어" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "앱 검색" }), {
      target: { value: "형성평가" }
    });

    const activeFilters = screen.getByLabelText("활성 필터");

    expect(within(activeFilters).getByText("#영어")).toBeInTheDocument();
    expect(
      within(activeFilters).getByText('검색어 "형성평가"')
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /필터 초기화/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /필터 초기화/i }));

    expect(screen.queryByLabelText("활성 필터")).not.toBeInTheDocument();
  });

  it("keeps only one representative tag selected at a time", () => {
    render(<ArchivePage initialApps={sampleApps} />);

    const englishTag = screen.getByRole("button", { name: "#영어" });
    const adminTag = screen.getByRole("button", { name: "#업무경감" });

    fireEvent.click(englishTag);
    fireEvent.click(adminTag);

    expect(englishTag).toHaveAttribute("aria-pressed", "false");
    expect(adminTag).toHaveAttribute("aria-pressed", "true");

    const activeFilters = screen.getByLabelText("활성 필터");

    expect(within(activeFilters).queryByText("#영어")).not.toBeInTheDocument();
    expect(within(activeFilters).getByText("#업무경감")).toBeInTheDocument();
  });
});
