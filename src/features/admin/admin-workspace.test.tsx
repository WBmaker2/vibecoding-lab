import { fireEvent, render, screen } from "@testing-library/react";
import type { AppRecord } from "@/lib/apps/types";
import { AdminWorkspace } from "./admin-workspace";

const noopAction = async () => {};

const apps: AppRecord[] = [
  {
    id: "app-1",
    title: "영어 단어 게임",
    summary: "수업 몰입을 돕는 영어 단어 복습 게임",
    url: "https://example.com/word-game",
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

    fireEvent.click(
      screen.getByRole("button", { name: "영어 단어 게임 편집" })
    );

    expect(
      screen.getByRole("heading", { name: "영어 단어 게임 수정" })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("영어 단어 게임")).toBeInTheDocument();
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
    expect(screen.getByText("메모 있음")).toBeInTheDocument();
    expect(screen.getByText("썸네일 자동")).toBeInTheDocument();
    expect(screen.getByText("태그 2개")).toBeInTheDocument();
    expect(screen.getByText("기본 이미지")).toBeInTheDocument();
  });
});
