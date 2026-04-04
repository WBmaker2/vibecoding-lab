import { fireEvent, render, screen } from "@testing-library/react";
import { TagInput } from "./tag-input";

describe("TagInput", () => {
  it("adds a suggested tag when the suggestion button is clicked", () => {
    render(
      <TagInput
        initialTags={["형성평가"]}
        name="tagsJson"
        suggestedTags={["영어", "형성평가", "게임형"]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "#영어 추가" }));

    expect(screen.getByDisplayValue('["형성평가","영어"]')).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#영어 이미 선택됨" })
    ).toBeDisabled();
  });

  it("shows existing tag suggestions under the input", () => {
    render(
      <TagInput
        initialTags={[]}
        name="tagsJson"
        suggestedTags={["업무경감", "수업준비"]}
      />
    );

    expect(screen.getByText("기존 태그")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#업무경감 추가" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#수업준비 추가" })
    ).toBeInTheDocument();
  });
});
