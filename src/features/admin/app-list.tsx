"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminAppRecord } from "@/lib/apps/types";
import {
  getAdminNotePreview,
  type RecentAdminChange
} from "./change-highlights";

interface AppListProps {
  apps: AdminAppRecord[];
  deleteAction: (formData: FormData) => void | Promise<void>;
  onRemoveTag: (appId: string, tag: string) => void | Promise<void>;
  onSelectApp: (appId: string) => void;
  recentChange?: RecentAdminChange | null;
  selectedAppId: string | null;
}

function getThumbnailModeLabel(app: AdminAppRecord) {
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
  onRemoveTag,
  onSelectApp,
  recentChange,
  selectedAppId
}: AppListProps) {
  const [expandedTagAppIds, setExpandedTagAppIds] = useState<Set<string>>(
    () => new Set()
  );
  const [removingTagKey, setRemovingTagKey] = useState<string | null>(null);

  function toggleTagDetails(appId: string) {
    setExpandedTagAppIds((current) => {
      const next = new Set(current);

      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }

      return next;
    });
  }

  async function handleRemoveTag(app: AdminAppRecord, tag: string) {
    if (app.tags.length <= 1 || removingTagKey !== null) {
      return;
    }

    const confirmed = window.confirm(
      `${app.title} 앱에서 '#${tag}' 태그를 삭제할까요?`
    );

    if (!confirmed) {
      return;
    }

    const tagKey = `${app.id}:${tag}`;

    setRemovingTagKey(tagKey);

    try {
      await onRemoveTag(app.id, tag);
    } catch {
      window.alert("태그를 삭제하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setRemovingTagKey(null);
    }
  }

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
      {apps.map((app) => {
        const recentFields =
          recentChange?.appId === app.id ? recentChange.fields : [];
        const notePreview = getAdminNotePreview(app.memo);
        const isTagDetailsExpanded = expandedTagAppIds.has(app.id);
        const tagDetailsId = `admin-app-tags-${app.id}`;

        return (
          <article
            className={
              [
                "admin-app-card",
                selectedAppId === app.id ? "is-active" : "",
                recentFields.length > 0 ? "is-recent" : ""
              ]
                .filter(Boolean)
                .join(" ")
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
                {app.githubUrl ? (
                  <Link
                    className="admin-secondary-button admin-github-button"
                    href={app.githubUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Github
                  </Link>
                ) : null}
                <form action={deleteAction}>
                  <input name="id" type="hidden" value={app.id} />
                  <button className="admin-danger-button" type="submit">
                    삭제
                  </button>
                </form>
              </div>
            </div>

            {recentFields.length > 0 ? (
              <div
                aria-label={`${app.title} 최근 수정 필드`}
                className="admin-app-recent-update"
              >
                <span className="admin-update-badge">최근 수정</span>
                {recentFields.map((field) => (
                  <span
                    className="admin-meta-pill admin-meta-pill-highlight"
                    key={field}
                  >
                    {field}
                  </span>
                ))}
              </div>
            ) : null}

            {notePreview ? (
              <p className="admin-app-note-preview">
                <strong>메이커 노트</strong>
                <span>{notePreview}</span>
              </p>
            ) : null}

            <div className="admin-app-meta">
              <button
                aria-controls={tagDetailsId}
                aria-expanded={isTagDetailsExpanded}
                aria-label={
                  isTagDetailsExpanded
                    ? `${app.title} 태그 접기`
                    : `${app.title} 태그 ${app.tags.length}개 보기`
                }
                className="admin-meta-pill admin-tag-count-button"
                onClick={() => toggleTagDetails(app.id)}
                type="button"
              >
                태그 {app.tags.length}개
                <span aria-hidden="true" className="admin-tag-count-icon">
                  {isTagDetailsExpanded ? "접기" : "보기"}
                </span>
              </button>
              <span className="admin-meta-pill">{getThumbnailModeLabel(app)}</span>
              {app.subject ? (
                <span className="admin-meta-pill">과목 {app.subject}</span>
              ) : null}
              {app.grade ? (
                <span className="admin-meta-pill">학년 {app.grade}</span>
              ) : null}
            </div>

            {isTagDetailsExpanded ? (
              <div
                aria-label={`${app.title} 등록 태그`}
                className="admin-app-tag-details"
                id={tagDetailsId}
              >
                {app.tags.map((tag) => (
                  <button
                    aria-label={`#${tag} 태그 삭제`}
                    className="admin-tag-detail-pill admin-tag-detail-button"
                    disabled={app.tags.length <= 1 || removingTagKey !== null}
                    key={tag}
                    onClick={() => handleRemoveTag(app, tag)}
                    type="button"
                  >
                    <span>#{tag}</span>
                    <span aria-hidden="true" className="admin-tag-detail-remove">
                      삭제
                    </span>
                  </button>
                ))}

                {app.tags.length <= 1 ? (
                  <p className="admin-tag-detail-note">
                    앱에는 태그가 최소 1개 필요합니다. 마지막 태그는 워크벤치에서
                    다른 태그를 추가한 뒤 정리해 주세요.
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
