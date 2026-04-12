import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import type { AdminAppRecord } from "@/lib/apps/types";
import { AdminWorkspace } from "./admin-workspace";

const noopAction = async () => {};

const apps: AdminAppRecord[] = [
  {
    id: "app-1",
    title: "영어 단어 게임",
    summary: "수업 몰입을 돕는 영어 단어 복습 게임",
    url: "https://example.com/word-game",
    githubUrl: "https://github.com/WBmaker2/word-game",
    tags: ["영어", "게임형", "형성평가"],
    thumbnailMode: "auto",
    thumbnailUrl: "https://example.com/thumb-1.png",
    subject: "영어",
    grade: "초등 5학년",
    memo: "게임 전 설명용 슬라이드와 함께 쓰면 좋습니다.",
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z")
  },
  {
    id: "app-2",
    title: "자리 배치 도우미",
    summary: "교실 자리 배치를 빠르게 바꿔보는 도구",
    url: "https://example.com/seating",
    githubUrl: undefined,
    tags: ["업무경감", "학급운영"],
    thumbnailMode: "placeholder",
    thumbnailUrl: null,
    subject: "창체",
    grade: "중등 1학년",
    memo: "",
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z")
  }
];

describe("AdminWorkspace", () => {
  it("switches the workbench into edit mode when an app card is selected", () => {
    render(
      <AdminWorkspace
        apps={apps}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    expect(
      screen.getByRole("heading", { name: "등록 / 수정 워크벤치" })
    ).toBeInTheDocument();
    expect(screen.getByText("신규 등록 모드")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("https://github.com/...")
    ).toHaveValue("");

    fireEvent.click(
      screen.getByRole("button", { name: "영어 단어 게임 편집" })
    );

    expect(
      screen.getByRole("heading", { name: "영어 단어 게임 수정" })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("영어 단어 게임")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://github.com/WBmaker2/word-game")).toHaveValue(
      "https://github.com/WBmaker2/word-game"
    );
    expect(screen.getByText("수정 모드")).toBeInTheDocument();
  });

  it("shows compact metadata for each registered app card", () => {
    render(
      <AdminWorkspace
        apps={apps}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    expect(screen.getByText("태그 3개")).toBeInTheDocument();
    expect(screen.getByText("썸네일 자동")).toBeInTheDocument();
    expect(screen.getByText("태그 2개")).toBeInTheDocument();
    expect(screen.getByText("기본 이미지")).toBeInTheDocument();
    expect(
      screen.getByText(/게임 전 설명용 슬라이드와 함께 쓰면 좋습니다/)
    ).toBeInTheDocument();
  });

  it("shows a JSON backup action in the workspace header", () => {
    render(
      <AdminWorkspace
        apps={apps}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    expect(
      screen.getByRole("link", { name: "JSON 백업" })
    ).toHaveAttribute("href", "/api/admin/backup");
  });

  it("shows a Github action only for apps with a github link", () => {
    render(
      <AdminWorkspace
        apps={apps}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    const githubLinks = screen.getAllByRole("link", { name: "Github" });

    expect(githubLinks).toHaveLength(1);
    expect(githubLinks[0]).toHaveAttribute(
      "href",
      "https://github.com/WBmaker2/word-game"
    );
  });

  it("updates the library card immediately after saving and highlights changed fields", async () => {
    const updateAction = async () => {};

    render(
      <AdminWorkspace
        apps={apps}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={updateAction}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "영어 단어 게임 편집" })
    );

    fireEvent.change(screen.getByLabelText("학년"), {
      target: { value: "초등 3~6학년" }
    });
    fireEvent.change(screen.getByLabelText("메이커 노트"), {
      target: {
        value:
          "교사가 단어 세트를 저장·공개하면 학생은 학교·선생님·학년·단원을 선택해 여러 활동으로 이어서 사용할 수 있습니다."
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }));

    await waitFor(() => {
      expect(
        screen.getByLabelText("영어 단어 게임 최근 수정 필드")
      ).toBeInTheDocument();
    });

    const updatedCardHeading = screen.getByRole("heading", {
      name: "영어 단어 게임"
    });
    const updatedCard = updatedCardHeading.closest("article");

    expect(updatedCard).not.toBeNull();

    const cardScope = within(updatedCard as HTMLElement);
    const recentChangeSummary = screen.getByLabelText(
      "영어 단어 게임 최근 수정 필드"
    );

    expect(within(recentChangeSummary).getByText("학년")).toBeInTheDocument();
    expect(
      within(recentChangeSummary).getByText("메이커 노트")
    ).toBeInTheDocument();
    expect(cardScope.getByText("학년 초등 3~6학년")).toBeInTheDocument();
    expect(
      cardScope.getByText(
        /교사가 단어 세트를 저장·공개하면 학생은 학교·선생님/
      )
    ).toBeInTheDocument();
  });
});
