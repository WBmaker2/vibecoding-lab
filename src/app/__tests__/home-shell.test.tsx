import { render, screen } from "@testing-library/react";
import HomePage from "../page";

describe("HomePage", () => {
  it("renders the archive hero and search UI", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", { name: /Hong's Vibe Coding Lab/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/공개 아카이브/i)).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: /앱 검색/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/^대표 태그$/)).toBeInTheDocument();
  });
});
