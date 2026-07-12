import { fireEvent, render, screen } from "@testing-library/react";
import { TagInput } from "./tag-input";

describe("TagInput", () => {
  it("stores a manually entered hashtag without the display prefix", () => {
    render(<TagInput initialTags={[]} name="tagsJson" suggestedTags={[]} />);

    const input = screen.getByPlaceholderText("엔터 또는 쉼표로 태그 추가");

    fireEvent.change(input, { target: { value: "#업무경감" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByDisplayValue('["업무경감"]')).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#업무경감 제거" })
    ).toBeInTheDocument();
    expect(screen.queryByText("##업무경감")).not.toBeInTheDocument();
  });

  it("normalizes initial and suggested tags that already include hashtags", () => {
    render(
      <TagInput
        initialTags={["#업무경감"]}
        name="tagsJson"
        suggestedTags={["#업무경감", "##수업준비"]}
      />
    );

    expect(screen.getByDisplayValue('["업무경감"]')).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#업무경감 제거" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#수업준비 추가" })
    ).toBeInTheDocument();
  });

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

  it("removes only the clicked selected tag", () => {
    render(
      <TagInput
        initialTags={["학생기록", "교사도구", "시트연동"]}
        name="tagsJson"
        suggestedTags={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "#교사도구 제거" }));

    expect(
      screen.getByDisplayValue('["학생기록","시트연동"]')
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#학생기록 제거" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#시트연동 제거" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "#교사도구 제거" })).toBeNull();
  });

  it("does not add duplicate tags from rapid repeated selection", () => {
    render(
      <TagInput
        initialTags={[]}
        name="tagsJson"
        suggestedTags={["학생기록"]}
      />
    );

    const suggestion = screen.getByRole("button", { name: "#학생기록 추가" });

    fireEvent.click(suggestion);
    fireEvent.click(suggestion);

    expect(screen.getByDisplayValue('["학생기록"]')).toBeInTheDocument();
    expect(screen.getAllByText("#학생기록")).toHaveLength(2);
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
