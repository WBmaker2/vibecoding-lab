import { fireEvent, render, screen } from "@testing-library/react";
import { UpdateHistory } from "./update-history";

describe("UpdateHistory", () => {
  it("opens an accessible dialog with the exact dated entries", () => {
    render(<UpdateHistory />);

    const trigger = screen.getByRole("button", { name: "업데이트 내역" });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "Hong's Vibe Coding Lab 업데이트 내역"
    });

    expect(dialog).toHaveTextContent("2026-04-04");
    expect(dialog).toHaveTextContent("개발");
    expect(dialog).toHaveTextContent(
      "교실용 웹앱을 모아 찾고 열 수 있는 공개 아카이브를 시작했습니다."
    );
    expect(dialog).toHaveTextContent("2026-05-11");
    expect(dialog).toHaveTextContent(
      "공개 목록과 썸네일을 정적 자산으로 전환해 Vercel 사용량을 줄였습니다."
    );
    expect(dialog).toHaveTextContent("2026-07-12");
    expect(dialog).toHaveTextContent(
      "관리자 보안, 무변경 동기화, 상태 표시, 테스트와 모바일 탐색 화면을 개선했습니다."
    );
    expect(dialog).toHaveTextContent("2026-07-23");
    expect(dialog).toHaveTextContent(
      "관리자 동기화가 운영 main 브랜치에서 최신 앱 목록과 썸네일을 다시 만들도록 복구했습니다."
    );
    expect(dialog).toHaveTextContent("2026-08-09");
    expect(dialog).toHaveTextContent(
      "관리자 DB 한도 초과 시 서버 오류 대신 읽기 전용 스냅샷 안내 화면을 표시하도록 개선했습니다."
    );

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape and restores body scrolling", () => {
    render(<UpdateHistory />);
    const trigger = screen.getByRole("button", { name: "업데이트 내역" });

    fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
  });

  it("contains forward and backward Tab navigation inside the dialog", () => {
    render(<UpdateHistory />);
    fireEvent.click(screen.getByRole("button", { name: "업데이트 내역" }));

    const closeButton = screen.getByRole("button", { name: "닫기" });
    expect(closeButton).toHaveFocus();

    const forwardTab = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab"
    });
    fireEvent(document, forwardTab);

    expect(forwardTab.defaultPrevented).toBe(true);
    expect(closeButton).toHaveFocus();

    const backwardTab = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
      shiftKey: true
    });
    fireEvent(document, backwardTab);

    expect(backwardTab.defaultPrevented).toBe(true);
    expect(closeButton).toHaveFocus();
  });

  it("removes the focus trap and restores body scrolling on unmount", () => {
    const outsideButton = document.createElement("button");
    document.body.append(outsideButton);
    const { unmount } = render(<UpdateHistory />);

    fireEvent.click(screen.getByRole("button", { name: "업데이트 내역" }));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    outsideButton.focus();

    const tabEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab"
    });
    fireEvent(document, tabEvent);

    expect(document.body.style.overflow).toBe("");
    expect(tabEvent.defaultPrevented).toBe(false);
    expect(outsideButton).toHaveFocus();

    outsideButton.remove();
  });
});
