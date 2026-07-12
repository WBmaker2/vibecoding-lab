import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import type { AdminAppRecord } from "@/lib/apps/types";
import { AdminWorkspace } from "./admin-workspace";

const { routerMock, routerRefreshMock } = vi.hoisted(() => {
  const routerRefreshMock = vi.fn();

  return {
    routerMock: { refresh: routerRefreshMock },
    routerRefreshMock
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock
}));

const noopAction = async () => {};
const originalConsoleError = console.error.bind(console);
const actWarnings: string[] = [];

const baseline = {
  generatedAt: "2026-07-10T00:00:00.000Z",
  appCount: 2,
  updatedAtById: {
    "app-1": "2026-04-05T00:00:00.000Z",
    "app-2": "2026-04-05T00:00:00.000Z"
  }
};

const changedBaseline = {
  generatedAt: baseline.generatedAt,
  appCount: 0,
  updatedAtById: {}
};

function readGlobalStyles() {
  return readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
}

function getCssBlock(css: string, selector: string) {
  const match = css.match(new RegExp(`${selector} \\{([\\s\\S]*?)\\n\\}`));

  return match?.[1] ?? "";
}

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
  beforeEach(() => {
    routerRefreshMock.mockReset();
    actWarnings.length = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise<Response>(() => {})
    );
    vi.spyOn(console, "error").mockImplementation((...args) => {
      originalConsoleError(...args);

      const message = args.map(String).join(" ");

      if (message.includes("not wrapped in act")) {
        actWarnings.push(message);
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    const unexpectedActWarnings = [...actWarnings];
    vi.restoreAllMocks();
    expect(unexpectedActWarnings).toEqual([]);
  });

  it("switches the workbench into edit mode when an app card is selected", () => {
    render(
      <AdminWorkspace
        apps={apps}
        baseline={baseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
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
        baseline={baseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
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
        baseline={baseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    expect(
      screen.getByRole("link", { name: "JSON 백업" })
    ).toHaveAttribute("href", "/api/admin/backup");
  });

  it("shows no changes and disables sync when the snapshot matches", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ run: null }), { status: 200 })
    );

    render(
      <AdminWorkspace
        apps={apps}
        baseline={baseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    expect(
      await screen.findByText("동기화할 수정 사항이 없습니다")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "수정 사항 동기화" })
    ).toBeDisabled();
  });

  it("shows the union count of pending changes", () => {
    render(
      <AdminWorkspace
        apps={apps}
        baseline={changedBaseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    expect(screen.getByText("2건의 수정 사항")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "수정 사항 동기화" })
    ).not.toBeDisabled();
  });

  it("dispatches and polls the latest run until successful completion", async () => {
    vi.useFakeTimers();
    let statusRequestCount = 0;
    const activeRun = {
      id: 123,
      status: "in_progress",
      conclusion: null,
      htmlUrl: "https://github.com/WBmaker2/vibecoding-lab/actions/runs/123",
      createdAt: "2026-07-10T01:00:00.000Z",
      updatedAt: "2026-07-10T01:00:00.000Z"
    };
    const completedRun = { ...activeRun, status: "completed", conclusion: "success" };
    const fetchSpy = vi.mocked(globalThis.fetch);
    fetchSpy.mockImplementation(async (_input, init) => {
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ dispatched: true }), { status: 202 });
      }

      statusRequestCount += 1;
      return new Response(
        JSON.stringify({ run: statusRequestCount === 1 ? null : statusRequestCount === 2 ? activeRun : completedRun }),
        { status: 200 }
      );
    });

    render(
      <AdminWorkspace
        apps={apps}
        baseline={changedBaseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "수정 사항 동기화" }));
      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/admin/sync-static-gallery",
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByRole("link", { name: "GitHub Actions에서 보기" })).toHaveAttribute(
      "href",
      activeRun.htmlUrl
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(routerRefreshMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("동기화가 완료되었습니다");
    const requestCountAfterCompletion = statusRequestCount;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(statusRequestCount).toBe(requestCountAfterCompletion);
  }, 12000);

  it("keeps sync disabled and shows the active run link", async () => {
    const activeRun = {
      id: 321,
      status: "queued",
      conclusion: null,
      htmlUrl: "https://github.com/WBmaker2/vibecoding-lab/actions/runs/321",
      createdAt: "2026-07-10T01:00:00.000Z",
      updatedAt: "2026-07-10T01:00:00.000Z"
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ run: activeRun }), { status: 200 })
    );

    render(
      <AdminWorkspace
        apps={apps}
        baseline={changedBaseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    await screen.findByRole("link", { name: "GitHub Actions에서 보기" });
    expect(screen.getByRole("button", { name: "수정 사항 동기화" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "GitHub Actions에서 보기" })).toHaveAttribute(
      "target",
      "_blank"
    );
  });

  it("shows an error when the workflow completes unsuccessfully", async () => {
    const failedRun = {
      id: 654,
      status: "completed",
      conclusion: "failure",
      htmlUrl: "https://github.com/WBmaker2/vibecoding-lab/actions/runs/654",
      createdAt: "2026-07-10T01:00:00.000Z",
      updatedAt: "2026-07-10T01:00:00.000Z"
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ run: failedRun }), { status: 200 })
    );

    render(
      <AdminWorkspace
        apps={apps}
        baseline={changedBaseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "동기화에 실패했습니다"
    );
  });

  it("shows a Github action only for apps with a github link", () => {
    render(
      <AdminWorkspace
        apps={apps}
        baseline={baseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
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
        baseline={baseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={noopAction}
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

  it("stacks the registered app library below the workbench in the admin layout", () => {
    const gridStyles = getCssBlock(
      readGlobalStyles(),
      "\\.admin-workspace-grid"
    );

    expect(gridStyles).toContain("grid-template-columns: 1fr");
  });

  it("removes a registered tag from the library card after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const removeTagAction = async () => {};

    render(
      <AdminWorkspace
        apps={apps}
        baseline={baseline}
        createAction={noopAction}
        deleteAction={noopAction}
        logoutAction={noopAction}
        removeTagAction={removeTagAction}
        suggestedTags={["영어", "게임형", "업무경감"]}
        updateAction={noopAction}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "영어 단어 게임 태그 3개 보기"
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "#영어 태그 삭제" }));

    await waitFor(() => {
      expect(screen.getByText("태그 2개")).toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalledWith(
      "영어 단어 게임 앱에서 '#영어' 태그를 삭제할까요?"
    );
    expect(screen.queryByText("#영어")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("영어 단어 게임 최근 수정 필드")
    ).toBeInTheDocument();

    confirmSpy.mockRestore();
  });
});
