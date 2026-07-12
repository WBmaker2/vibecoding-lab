import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the no-results mascot from its direct static asset path", () => {
    render(<EmptyState query="science" />);

    const mascotImage = screen.getByAltText(
      "검색 결과가 없을 때 안내하는 Hong 캐릭터"
    );

    expect(mascotImage).toHaveAttribute(
      "src",
      "/images/mascots/hong-default.png"
    );
    expect(mascotImage).not.toHaveAttribute(
      "src",
      expect.stringContaining("/_next/image")
    );
  });
});
