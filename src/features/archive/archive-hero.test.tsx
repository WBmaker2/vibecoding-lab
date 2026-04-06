import { render, screen } from "@testing-library/react";
import { ArchiveHero } from "./archive-hero";

describe("ArchiveHero", () => {
  it("shows the updated Hong's Note label inside a dedicated header row", () => {
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
    expect(container.querySelector(".mascot-note-header")).toContainElement(
      screen.getByText("Hong's Note")
    );
  });
});
