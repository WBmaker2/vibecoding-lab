import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ArchiveHero } from "./archive-hero";

const REPRESENTATIVE_TAGS = [
  "수업",
  "수학",
  "융합",
  "과학",
  "사회",
  "데이터",
  "업무",
  "국어",
  "담임",
  "시뮬레이션"
];

function FilterableArchiveHero() {
  const [activeTags, setActiveTags] = useState<string[]>([]);

  return (
    <ArchiveHero
      activeTags={activeTags}
      allTags={[...REPRESENTATIVE_TAGS, "영어"]}
      onQueryChange={() => {}}
      onToggleTag={(tag) =>
        setActiveTags((current) => (current.includes(tag) ? [] : [tag]))
      }
      query=""
      representativeTags={REPRESENTATIVE_TAGS}
    />
  );
}

describe("ArchiveHero", () => {
  it("keeps the mascot image beside the headline and outside the Hong's Note card", () => {
    const { container } = render(
      <ArchiveHero
        activeTags={[]}
        onQueryChange={() => {}}
        onToggleTag={() => {}}
        query=""
        allTags={["과학", "업무경감", "영어"]}
        representativeTags={["영어", "업무경감"]}
      />
    );

    const heroTop = container.querySelector(".archive-hero-top");
    const mascotImage = container.querySelector(".archive-hero-mascot-image");

    expect(heroTop).toContainElement(mascotImage as HTMLElement);
    expect(container.querySelector(".mascot-note-shell")).not.toBeInTheDocument();
    expect(container.querySelector(".hero-frame")).not.toBeInTheDocument();
  });

  it("renders the mascot from its direct static asset path", () => {
    render(
      <ArchiveHero
        activeTags={[]}
        onQueryChange={() => {}}
        onToggleTag={() => {}}
        query=""
        allTags={[]}
        representativeTags={[]}
      />
    );

    const mascotImage = screen.getByAltText("태그 탐색을 안내하는 Hong 캐릭터");

    expect(mascotImage).toHaveAttribute(
      "src",
      "/images/mascots/hong-default.png"
    );
    expect(mascotImage).toHaveAttribute("width", "1856");
    expect(mascotImage).toHaveAttribute("height", "2304");
    expect(mascotImage).not.toHaveAttribute("src", expect.stringContaining("/_next/image"));
  });

  it("shows a subtle helper copy beside the representative tag heading", () => {
    render(
      <ArchiveHero
        activeTags={[]}
        onQueryChange={() => {}}
        onToggleTag={() => {}}
        query=""
        allTags={["업무경감", "영어", "과학"]}
        representativeTags={["영어", "업무경감"]}
      />
    );

    expect(screen.getByText("대표 태그")).toBeInTheDocument();
    expect(
      screen.getByText("바이브홍이 만든 교실 수업·교사 업무용 웹앱 아카이브입니다.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("태그를 하나씩 클릭해 원하는 앱을 알아보세요.")
    ).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "태그 필터" })).toBeVisible();
    expect(screen.getByRole("button", { name: "#영어" })).toBeVisible();
    expect(screen.getByRole("button", { name: "모든 태그 보기" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("expands and collapses the complete tag set", () => {
    render(
      <ArchiveHero
        activeTags={[]}
        onQueryChange={() => {}}
        onToggleTag={() => {}}
        query=""
        allTags={["과학", "업무경감", "영어"]}
        representativeTags={["영어", "업무경감"]}
      />
    );

    expect(screen.queryByRole("button", { name: "#과학" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "모든 태그 보기" }));

    expect(
      screen.getByRole("toolbar", { name: "태그 필터" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#과학" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "모든 태그 접기" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: "모든 태그 접기" }));

    expect(screen.queryByRole("button", { name: "#과학" })).not.toBeInTheDocument();
  });

  it("keeps a selected non-representative tag visible and removable after collapse", () => {
    render(<FilterableArchiveHero />);

    fireEvent.click(screen.getByRole("button", { name: "모든 태그 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "#영어" }));
    fireEvent.click(screen.getByRole("button", { name: "모든 태그 접기" }));

    const toolbar = screen.getByRole("toolbar", { name: "태그 필터" });
    const visibleTagLabels = Array.from(
      toolbar.querySelectorAll("button"),
      (button) => button.textContent
    );

    expect(visibleTagLabels).toEqual([
      "#수업",
      "#수학",
      "#융합",
      "#과학",
      "#사회",
      "#데이터",
      "#업무",
      "#국어",
      "#담임",
      "#영어"
    ]);
    expect(screen.getByRole("button", { name: "#영어" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(
      screen.queryByRole("button", { name: "#시뮬레이션" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "#영어" }));

    expect(screen.queryByRole("button", { name: "#영어" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#시뮬레이션" })
    ).toHaveAttribute("aria-pressed", "false");
  });
});
