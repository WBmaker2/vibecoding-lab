import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ArchiveCollections } from "./archive-collections";

describe("ArchiveCollections", () => {
  it("exposes curated presets and marks the selected preset", () => {
    const onSelect = vi.fn();
    render(<ArchiveCollections activeId="teacher-workflow" onSelect={onSelect} />);

    const teacherButton = screen.getByRole("button", { name: "교사 업무 도구" });
    expect(teacherButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "활동형 수업" }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "active-classroom" })
    );
  });
});
