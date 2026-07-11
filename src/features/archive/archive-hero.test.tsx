import { fireEvent, render, screen } from "@testing-library/react";
import { ArchiveHero } from "./archive-hero";

describe("ArchiveHero", () => {
  it("keeps the mascot image beside the headline and outside the Hong's Note card", () => {
    const { container } = render(
      <ArchiveHero
        activeTags={[]}
        onQueryChange={() => {}}
        onToggleTag={() => {}}
        query=""
        tags={["영어", "업무경감"]}
      />
    );

    expect(screen.getByText("Hong's Note")).toBeInTheDocument();
    expect(screen.queryByText("Hong Note")).not.toBeInTheDocument();

    const heroTop = container.querySelector(".archive-hero-top");
    const noteShell = container.querySelector(".mascot-note-shell");
    const mascotImage = container.querySelector(".archive-hero-mascot-image");

    expect(heroTop).toContainElement(mascotImage);
    expect(noteShell).not.toContainElement(mascotImage);
  });

  it("renders the mascot from its direct static asset path", () => {
    render(
      <ArchiveHero
        activeTags={[]}
        onQueryChange={() => {}}
        onToggleTag={() => {}}
        query=""
        tags={[]}
      />
    );

    const mascotImage = screen.getByAltText("태그 탐색을 안내하는 Hong 캐릭터");

    expect(mascotImage).toHaveAttribute(
      "src",
      "/images/mascots/hong-default.png"
    );
    expect(mascotImage).not.toHaveAttribute("src", expect.stringContaining("/_next/image"));
  });

  it("shows a subtle helper copy beside the representative tag heading", () => {
    render(
      <ArchiveHero
        activeTags={[]}
        onQueryChange={() => {}}
        onToggleTag={() => {}}
        query=""
        tags={["영어", "업무경감"]}
      />
    );

    expect(screen.getByText("대표 태그")).toBeInTheDocument();
    expect(
      screen.getByText("태그를 하나씩 클릭해 원하는 앱을 알아보세요.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "대표 태그 펼치기" })
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("toolbar", { name: "태그 필터" })
    ).not.toBeInTheDocument();
  });

  it("toggles representative tags with the arrow button", () => {
    render(
      <ArchiveHero
        activeTags={[]}
        onQueryChange={() => {}}
        onToggleTag={() => {}}
        query=""
        tags={["영어", "업무경감"]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "대표 태그 펼치기" }));

    expect(
      screen.getByRole("toolbar", { name: "태그 필터" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "대표 태그 접기" })
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "대표 태그 접기" }));

    expect(
      screen.queryByRole("toolbar", { name: "태그 필터" })
    ).not.toBeInTheDocument();
  });
});
