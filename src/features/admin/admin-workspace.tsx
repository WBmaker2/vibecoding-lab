"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminAppRecord } from "@/lib/apps/types";
import {
  buildAdminAppPreviewFromFormData,
  getChangedAdminFieldLabels,
  type RecentAdminChange
} from "./change-highlights";
import { AppForm } from "./app-form";
import { AppList } from "./app-list";

interface AdminWorkspaceProps {
  apps: AdminAppRecord[];
  createAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  logoutAction: (formData: FormData) => void | Promise<void>;
  suggestedTags: string[];
  updateAction: (formData: FormData) => void | Promise<void>;
}

export function AdminWorkspace({
  apps,
  createAction,
  deleteAction,
  logoutAction,
  suggestedTags,
  updateAction
}: AdminWorkspaceProps) {
  const [localApps, setLocalApps] = useState(apps);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [recentChange, setRecentChange] = useState<RecentAdminChange | null>(
    null
  );

  useEffect(() => {
    setLocalApps(apps);
  }, [apps]);

  const selectedApp = useMemo(
    () => localApps.find((app) => app.id === selectedAppId) ?? null,
    [localApps, selectedAppId]
  );

  const totalTags = useMemo(
    () => new Set(localApps.flatMap((app) => app.tags)).size,
    [localApps]
  );

  async function handleCreateAction(formData: FormData) {
    setRecentChange(null);
    await createAction(formData);
  }

  async function handleUpdateAction(formData: FormData) {
    const previous = selectedApp;

    await updateAction(formData);

    if (!previous) {
      return;
    }

    const next = buildAdminAppPreviewFromFormData(previous, formData);
    const changedFields = getChangedAdminFieldLabels(previous, next);

    setLocalApps((currentApps) =>
      currentApps.map((app) => (app.id === next.id ? next : app))
    );
    setRecentChange({
      appId: next.id,
      fields: changedFields
    });
  }

  return (
    <main className="page-shell admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Private Admin</p>
          <h1>관리자 작업실</h1>
          <p className="admin-header-copy">
            새 앱 등록과 기존 앱 수정 흐름을 한 작업실로 정리했습니다. 오른쪽
            라이브러리에서 앱을 고르면 왼쪽 워크벤치에 바로 불러옵니다.
          </p>
        </div>

        <div className="admin-utility-actions">
          <div className="admin-header-stats" aria-label="관리자 현황">
            <span className="admin-stat-pill">{apps.length}개 앱</span>
            <span className="admin-stat-pill">{totalTags}개 태그</span>
          </div>

          <div className="admin-header-actions">
            <a className="admin-secondary-button" href="/api/admin/backup">
              JSON 백업
            </a>

            <form action={logoutAction}>
              <button className="admin-secondary-button" type="submit">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="admin-workspace-grid">
        <section className="admin-panel admin-workbench-panel">
          <div className="admin-panel-header admin-workbench-header">
            <div>
              <p className="eyebrow">
                {selectedApp ? "Edit Mode" : "Create Mode"}
              </p>
              <h2>
                {selectedApp ? `${selectedApp.title} 수정` : "등록 / 수정 워크벤치"}
              </h2>
              <p>
                {selectedApp
                  ? "선택한 앱 정보가 워크벤치에 로드되었습니다. 수정 후 바로 저장하실 수 있습니다."
                  : "기본 정보, 태그, 썸네일, 추가 정보를 섹션별로 나눠서 입력합니다."}
              </p>
            </div>

            <div className="admin-mode-badge">
              {selectedApp ? "수정 모드" : "신규 등록 모드"}
            </div>
          </div>

          <AppForm
            action={selectedApp ? handleUpdateAction : handleCreateAction}
            initialApp={selectedApp ?? undefined}
            key={
              selectedApp
                ? `${selectedApp.id}-${selectedApp.updatedAt.toISOString()}`
                : "create-mode"
            }
            onCancelEdit={
              selectedApp ? () => setSelectedAppId(null) : undefined
            }
            submitLabel={selectedApp ? "수정 저장" : "앱 등록"}
            suggestedTags={suggestedTags}
          />
        </section>

        <section className="admin-panel admin-library-panel">
          <div className="admin-panel-header">
            <h2>등록된 앱 라이브러리</h2>
            <p>
              compact 카드에서 핵심 정보만 먼저 보고, 편집할 앱을 고르면
              왼쪽 워크벤치가 해당 앱 기준으로 전환됩니다.
            </p>
          </div>

          <AppList
            apps={localApps}
            deleteAction={deleteAction}
            onSelectApp={setSelectedAppId}
            recentChange={recentChange}
            selectedAppId={selectedAppId}
          />
        </section>
      </div>
    </main>
  );
}
