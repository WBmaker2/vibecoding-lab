import { render, screen } from "@testing-library/react";
import { ThumbnailControls } from "./thumbnail-controls";

describe("ThumbnailControls", () => {
  it("defaults to auto collection mode", () => {
    render(<ThumbnailControls />);

    expect(screen.getByLabelText("링크에서 자동 수집")).toBeChecked();
    expect(screen.getByLabelText("기본 이미지 사용")).not.toBeChecked();
  });
});
