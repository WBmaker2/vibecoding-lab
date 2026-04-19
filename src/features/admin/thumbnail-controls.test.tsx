import { fireEvent, render, screen } from "@testing-library/react";
import { ThumbnailControls } from "./thumbnail-controls";

describe("ThumbnailControls", () => {
  it("defaults to auto collection mode", () => {
    render(<ThumbnailControls />);

    expect(screen.getByLabelText("링크에서 자동 수집")).toBeChecked();
    expect(screen.getByLabelText("기본 이미지 사용")).not.toBeChecked();
  });

  it("requires confirmation before replacing an existing thumbnail with the default image", () => {
    render(<ThumbnailControls initialMode="auto" initialUrl="data:image/png;base64,existing" />);

    fireEvent.click(screen.getByLabelText("기본 이미지 사용"));

    expect(
      screen.getByLabelText("기존 썸네일을 기본 이미지로 바꾸겠습니다.")
    ).toBeInTheDocument();
  });
});
