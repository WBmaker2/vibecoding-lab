"use client";

import Link from "next/link";
import type { AppRecord } from "@/lib/apps/types";

interface AppListProps {
  apps: AppRecord[];
  deleteAction: (formData: FormData) => void | Promise<void>;
  onSelectApp: (appId: string) => void;
  selectedAppId: string | null;
}

function getThumbnailModeLabel(app: AppRecord) {
  switch (app.thumbnailMode) {
    case "auto":
      return "썸네일 자동";
    case "upload":
      return "직접 업로드";
    case "placeholder":
      return "기본 이미지";
    default:
      return "썸네일 설정";
  }
}

export function AppList({
  apps,
  deleteAction,
  onSelectApp,
  selectedAppId
}: AppListProps) {
  if (apps.length === 0) {
    return (
      <div className="admin-empty-library">
        <p className="eyebrow">Empty Library</p>
        <h3>아직 등록된 앱이 없습니다.</h3>
        <p>첫 앱을 등록하면 이곳에서 요약 정보와 편집 상태를 볼 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="admin-app-list">
      {apps.map((app) => (
        <article
          className={
            selectedAppId === app.id
              ? "admin-app-card is-active"
              : "admin-app-card"
          }
          key={app.id}
        >
          <div className="admin-app-card-top">
            <div>
              <p className="eyebrow">Registered App</p>
              <h2>{app.title}</h2>
              <p>{app.summary}</p>
            </div>

            <div className="admin-app-actions">
              <button
                aria-label={
                  selectedAppId === app.id
                    ? `${app.title} 편집 중`
                    : `${app.title} 편집`
                }
                className="admin-secondary-button"
                onClick={() => onSelectApp(app.id)}
                type="button"
              >
                {selectedAppId === app.id ? "편집 중" : "편집"}
              </button>
              <Link href={app.url} rel="noreferrer" target="_blank">
                앱 열기
              </Link>
              <form action={deleteAction}>
                <input name="id" type="hidden" value={app.id} />
                <button className="admin-danger-button" type="submit">
                  삭제
                </button>
              </form>
            </div>
          </div>

          <div className="admin-app-meta">
            <span className="admin-meta-pill">태그 {app.tags.length}개</span>
            <span className="admin-meta-pill">{getThumbnailModeLabel(app)}</span>
            {app.memo ? (
              <span className="admin-meta-pill">메모 있음</span>
            ) : null}
            {app.subject ? (
              <span className="admin-meta-pill">과목 {app.subject}</span>
            ) : null}
            {app.grade ? (
              <span className="admin-meta-pill">학년 {app.grade}</span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
