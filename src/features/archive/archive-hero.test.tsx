import { render, screen } from "@testing-library/react";
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
});
