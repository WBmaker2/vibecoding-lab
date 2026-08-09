"use client";

import { useEffect, useRef, useState } from "react";

export const UPDATE_HISTORY = [
  {
    date: "2026-08-09",
    kind: "개선",
    detail:
      "관리자 DB 한도 초과 시 서버 오류 대신 읽기 전용 스냅샷 안내 화면을 표시하도록 개선했습니다."
  },
  {
    date: "2026-07-23",
    kind: "개선",
    detail:
      "관리자 동기화가 운영 main 브랜치에서 최신 앱 목록과 썸네일을 다시 만들도록 복구했습니다."
  },
  {
    date: "2026-04-04",
    kind: "개발",
    detail: "교실용 웹앱을 모아 찾고 열 수 있는 공개 아카이브를 시작했습니다."
  },
  {
    date: "2026-05-11",
    kind: "개선",
    detail: "공개 목록과 썸네일을 정적 자산으로 전환해 Vercel 사용량을 줄였습니다."
  },
  {
    date: "2026-07-12",
    kind: "개선",
    detail:
      "관리자 보안, 무변경 동기화, 상태 표시, 테스트와 모바일 탐색 화면을 개선했습니다."
  }
] as const;

const DIALOG_TITLE = "Hong's Vibe Coding Lab 업데이트 내역";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(", ");

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (element) =>
      !element.hasAttribute("hidden") &&
      element.getAttribute("aria-hidden") !== "true"
  );
}

export function UpdateHistory() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const focusIsOutsideDialog = !dialogRef.current.contains(activeElement);

      if (focusIsOutsideDialog) {
        event.preventDefault();
        (event.shiftKey ? lastFocusable : firstFocusable).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function closeDialog() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        className="update-history-button"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        type="button"
      >
        업데이트 내역
      </button>

      {isOpen ? (
        <div className="update-history-backdrop">
          <div
            aria-labelledby="update-history-title"
            aria-modal="true"
            className="update-history-dialog"
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="update-history-dialog-header">
              <h2 id="update-history-title">{DIALOG_TITLE}</h2>
              <button
                aria-label="닫기"
                className="update-history-close"
                onClick={closeDialog}
                ref={closeRef}
                type="button"
              >
                닫기
              </button>
            </div>

            <ol className="update-history-list">
              {UPDATE_HISTORY.map((entry) => (
                <li key={entry.date}>
                  <div className="update-history-entry-meta">
                    <time dateTime={entry.date}>{entry.date}</time>
                    <span>{entry.kind}</span>
                  </div>
                  <p>{entry.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </>
  );
}
