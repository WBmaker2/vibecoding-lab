import { render, screen } from "@testing-library/react";
import { ArchiveHero } from "./archive-hero";

describe("ArchiveHero", () => {
  it("keeps the mascot image outside the Hong's Note card", () => {
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

    const mascotGroup = container.querySelector(".archive-hero-mascot");
    const noteShell = container.querySelector(".mascot-note-shell");
    const mascotImage = container.querySelector(".archive-hero-mascot-image");

    expect(mascotGroup).toContainElement(noteShell);
    expect(mascotGroup).toContainElement(mascotImage);
    expect(noteShell).not.toContainElement(mascotImage);
  });
});
