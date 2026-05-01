import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { vi } from "vitest";
import type { AdminAppRecord } from "@/lib/apps/types";
import { AppList } from "./app-list";

const apps: AdminAppRecord[] = [
  {
    id: "app-1",
    title: "Talking Vocab Quiz",
    summary: "초등 영어 수업에서 단어 세트를 불러와 듣기·말하기·게임 활동을 바로 여는 수업용 퀴즈 앱",
    url: "https://example.com/talking-vocab-quiz",
    githubUrl: "https://github.com/WBmaker2/talking-vacab-quiz",
    tags: ["영어", "게임형", "형성평가"],
    thumbnailMode: "placeholder",
    thumbnailUrl: null,
    subject: "영어",
    grade: "초등 3~6학년",
    memo: "교사가 단어 세트를 저장·공개하면 학생은 학교·선생님·학년·단원을 선택해 여러 활동으로 이어서 사용할 수 있습니다.",
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-12T12:16:27.632Z")
  }
];

describe("AppList", () => {
  it("shows recent changed field highlights and a note preview for the updated card", () => {
    render(
      <AppList
        apps={apps}
        deleteAction={async () => {}}
        onSelectApp={() => {}}
        onRemoveTag={async () => {}}
        recentChange={{
          appId: "app-1",
          fields: ["학년", "메이커 노트"]
        }}
        selectedAppId="app-1"
      />
    );

    expect(screen.getByText("최근 수정")).toBeInTheDocument();
    const recentChangeSummary = screen.getByLabelText(
      "Talking Vocab Quiz 최근 수정 필드"
    );

    expect(within(recentChangeSummary).getByText("학년")).toBeInTheDocument();
    expect(
      within(recentChangeSummary).getByText("메이커 노트")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/교사가 단어 세트를 저장·공개하면 학생은 학교·선생님/)
    ).toBeInTheDocument();
  });

  it("expands the registered tags when the tag count button is clicked", () => {
    render(
      <AppList
        apps={apps}
        deleteAction={async () => {}}
        onSelectApp={() => {}}
        onRemoveTag={async () => {}}
        selectedAppId={null}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Talking Vocab Quiz 태그 3개 보기"
      })
    );

    const tagDetails = screen.getByLabelText("Talking Vocab Quiz 등록 태그");

    expect(within(tagDetails).getByText("#영어")).toBeInTheDocument();
    expect(within(tagDetails).getByText("#게임형")).toBeInTheDocument();
    expect(within(tagDetails).getByText("#형성평가")).toBeInTheDocument();
  });

  it("asks for confirmation before removing a tag from the library card", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onRemoveTag = vi.fn().mockResolvedValue(undefined);

    render(
      <AppList
        apps={apps}
        deleteAction={async () => {}}
        onRemoveTag={onRemoveTag}
        onSelectApp={() => {}}
        selectedAppId={null}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Talking Vocab Quiz 태그 3개 보기"
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "#영어 태그 삭제" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Talking Vocab Quiz 앱에서 '#영어' 태그를 삭제할까요?"
    );

    await waitFor(() => {
      expect(onRemoveTag).toHaveBeenCalledWith("app-1", "영어");
    });

    confirmSpy.mockRestore();
  });

  it("keeps tags unchanged when the removal confirmation is cancelled", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onRemoveTag = vi.fn();

    render(
      <AppList
        apps={apps}
        deleteAction={async () => {}}
        onRemoveTag={onRemoveTag}
        onSelectApp={() => {}}
        selectedAppId={null}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Talking Vocab Quiz 태그 3개 보기"
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "#영어 태그 삭제" }));

    expect(onRemoveTag).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
