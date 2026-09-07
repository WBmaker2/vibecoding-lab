"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminAppRecord } from "@/lib/apps/types";
import { normalizeAppMetadata } from "@/lib/apps/metadata";
import { filterApps, sortApps } from "@/lib/search/filter-apps";
import type {
  StaticGalleryAssetIntegrity,
  StaticGalleryBaseline
} from "@/lib/apps/static-gallery-sync-state";
import {
  buildAdminAppPreviewFromFormData,
  getChangedAdminFieldLabels,
  type RecentAdminChange
} from "./change-highlights";
import { AdminBulkActions } from "./admin-bulk-actions";
import { AppForm } from "./app-form";
import { AdminAppPreview, type AdminAppDraft } from "./admin-app-preview";
import {
  AdminLibraryControls,
  type AdminListSort,
  type AdminListStatus
} from "./admin-library-controls";
import { AdminLibraryPagination } from "./admin-library-pagination";
import { AppList } from "./app-list";
import { useAdminBulkSelection } from "./use-admin-bulk-selection";
import { useAdminSync } from "./use-admin-sync";
import { UpdateHistory } from "@/features/archive/update-history";

interface AdminWorkspaceProps {
  assetIntegrity?: StaticGalleryAssetIntegrity;
  apps: AdminAppRecord[];
  baseline: StaticGalleryBaseline;
  bulkClassificationAction?: (formData: FormData) => void | Promise<void>;
  bulkTagAction?: (formData: FormData) => void | Promise<void>;
  createAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  logoutAction: (formData: FormData) => void | Promise<void>;
  removeTagAction: (formData: FormData) => void | Promise<void>;
  suggestedTags: string[];
  updateAction: (formData: FormData) => void | Promise<void>;
}

export function AdminWorkspace({
  assetIntegrity,
  apps,
  baseline,
  bulkClassificationAction = async () => {},
  bulkTagAction = async () => {},
  createAction,
  deleteAction,
  logoutAction,
  removeTagAction,
  suggestedTags,
  updateAction
}: AdminWorkspaceProps) {
  const [localApps, setLocalApps] = useState(apps);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [librarySubject, setLibrarySubject] = useState("all");
  const [libraryStatus, setLibraryStatus] = useState<AdminListStatus>("all");
  const [librarySort, setLibrarySort] = useState<AdminListSort>("updated");
  const [libraryPage, setLibraryPage] = useState(1);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [draftPreview, setDraftPreview] = useState<AdminAppDraft | null>(null);
  const [recentChange, setRecentChange] = useState<RecentAdminChange | null>(
    null
  );
  const workbenchRef = useRef<HTMLElement>(null);
  const {
    applyTagUpdates,
    applyClassificationUpdates,
    clearSelection,
    selectedAppIds,
    selectedApps,
    toggleAppSelection
  } = useAdminBulkSelection({
    apps: localApps,
    setApps: setLocalApps,
    setRecentChange
  });
  const {
    formatSnapshotDate,
    getRunStatusLabel,
    handleStaticGallerySync,
    syncPending,
    syncRun,
    syncStatus,
    syncSummary,
    syncTrackingIsActive
  } = useAdminSync({ apps: localApps, assetIntegrity, baseline });

  useEffect(() => {
    setLocalApps(apps);
  }, [apps]);

  useEffect(() => {
    if (!isFormDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormDirty]);

  const selectedApp = useMemo(
    () => localApps.find((app) => app.id === selectedAppId) ?? null,
    [localApps, selectedAppId]
  );

  const totalTags = useMemo(
    () => new Set(localApps.flatMap((app) => app.tags)).size,
    [localApps]
  );

  const pendingAppIds = useMemo(() => {
    const ids = new Set<string>();

    for (const app of localApps) {
      const baselineUpdatedAt = baseline.updatedAtById[app.id];
      const baselineTimestamp = baselineUpdatedAt
        ? Date.parse(baselineUpdatedAt)
        : Number.NaN;
      if (
        !Number.isFinite(baselineTimestamp) ||
        baselineTimestamp !== app.updatedAt.getTime()
      ) {
        ids.add(app.id);
      }
    }

    return ids;
  }, [baseline.updatedAtById, localApps]);

  const librarySubjects = useMemo(() => {
    const values = new Set(
      localApps.flatMap((app) => normalizeAppMetadata(app).subjects)
    );
    return [...values].sort((left, right) => left.localeCompare(right, "ko"));
  }, [localApps]);

  const filteredLibraryApps = useMemo(() => {
    const appsByFields = filterApps(localApps, libraryQuery, [], {
      subjects: librarySubject === "all" ? [] : [librarySubject]
    }).filter((app) => {
      if (libraryStatus === "pending") return pendingAppIds.has(app.id);
      if (libraryStatus === "synced") return !pendingAppIds.has(app.id);
      return true;
    });

    return sortApps(appsByFields, librarySort);
  }, [libraryQuery, librarySort, libraryStatus, librarySubject, localApps, pendingAppIds]);

  const libraryPageCount = Math.max(1, Math.ceil(filteredLibraryApps.length / 24));
  const safeLibraryPage = Math.min(libraryPage, libraryPageCount);
  const visibleLibraryApps = filteredLibraryApps.slice(
    (safeLibraryPage - 1) * 24,
    safeLibraryPage * 24
  );
  useEffect(() => {
    if (!selectedAppId) return;

    workbenchRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "start"
    });
    document.getElementById("admin-title")?.focus();
  }, [selectedAppId]);
  const currentSuggestedTags = useMemo(() => {
    const tags = [...new Set(localApps.flatMap((app) => app.tags))].sort(
      (left, right) => left.localeCompare(right, "ko")
    );

    return tags.length > 0 ? tags : suggestedTags;
  }, [localApps, suggestedTags]);
  const selectApp = useCallback(
    (appId: string) => {
      if (appId === selectedAppId) return;

      if (isFormDirty) {
        const confirmed = window.confirm(
          "저장하지 않은 변경 사항이 있습니다. 다른 앱으로 이동하면 입력 내용이 사라집니다. 이동할까요?"
        );
        if (!confirmed) return;
      }

      setIsFormDirty(false);
      setSelectedAppId(appId);
      clearSelection();
      setDraftPreview(null);
      setSaveStatus(null);
    },
    [clearSelection, isFormDirty, selectedAppId]
  );
  const startCreate = useCallback(() => {
    if (isFormDirty) {
      const confirmed = window.confirm(
        "저장하지 않은 변경 사항이 있습니다. 신규 등록 화면으로 전환할까요?"
      );
      if (!confirmed) return;
    }

    setIsFormDirty(false);
    setSelectedAppId(null);
    clearSelection();
    setDraftPreview(null);
    setSaveStatus(null);
    window.setTimeout(() => {
      workbenchRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "start"
      });
      document.getElementById("admin-title")?.focus();
    }, 0);
  }, [clearSelection, isFormDirty]);
  async function handleCreateAction(formData: FormData) {
    setRecentChange(null);
    setSaveStatus(null);
    await createAction(formData);
    setIsFormDirty(false);
    setSaveStatus("저장했습니다. 공개 페이지에는 아직 반영되지 않았습니다.");
    setDraftPreview(null);
  }
  async function handleUpdateAction(formData: FormData) {
    const previous = selectedApp;

    setSaveStatus(null);
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
    setIsFormDirty(false);
    setSaveStatus("저장했습니다. 공개 페이지에는 아직 반영되지 않았습니다.");
    setDraftPreview(null);
  }

  async function handleRemoveTag(appId: string, tag: string) {
    const targetApp = localApps.find((app) => app.id === appId);

    if (!targetApp || targetApp.tags.length <= 1) {
      return;
    }

    const formData = new FormData();

    formData.set("id", appId);
    formData.set("tag", tag);

    await removeTagAction(formData);

    setLocalApps((currentApps) =>
      currentApps.map((app) =>
        app.id === appId
          ? {
              ...app,
              tags: app.tags.filter((item) => item !== tag),
              updatedAt: new Date()
            }
          : app
      )
    );
    setRecentChange({
      appId,
      fields: ["태그"]
    });
  }

  return (
    <main className="page-shell admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Private Admin</p>
          <h1>관리자 작업실</h1>
          <p className="admin-header-copy">
            새 앱 등록과 기존 앱 수정 흐름을 한 작업실로 정리했습니다. 아래
            라이브러리에서 앱을 고르면 위 워크벤치에 바로 불러옵니다.
          </p>
        </div>

        <div className="admin-utility-actions">
          <div className="admin-header-stats" aria-label="관리자 현황">
            <span className="admin-stat-pill">{localApps.length}개 앱</span>
            <span className="admin-stat-pill">{totalTags}개 태그</span>
            <span className="admin-stat-pill admin-stat-pill-pending">
              {pendingAppIds.size}개 공개 반영 대기
            </span>
          </div>

          <div className="admin-header-actions">
            <button
              className="admin-primary-button"
              onClick={startCreate}
              type="button"
            >
              새 앱 등록
            </button>
            <UpdateHistory />
            <button
              className="admin-secondary-button"
              disabled={
                syncPending ||
                syncSummary.pendingCount === 0 ||
                syncTrackingIsActive
              }
              onClick={handleStaticGallerySync}
              type="button"
            >
              {syncPending ? "동기화 시작 중..." : "수정 사항 동기화"}
            </button>

            <a className="admin-secondary-button" href="/api/admin/backup">
              JSON 백업
            </a>

            <form action={logoutAction}>
              <button className="admin-secondary-button" type="submit">
                로그아웃
              </button>
            </form>
          </div>

          <div
            className={`admin-sync-status${syncStatus ? ` admin-sync-status-${syncStatus.kind}` : ""}`}
            role="status"
          >
            <p className="admin-sync-status-primary">
              {syncSummary.pendingCount === 0
                ? "동기화할 수정 사항이 없습니다"
                : `${syncSummary.pendingCount}건의 수정 사항`}
            </p>
            <p>
              DB 앱 {syncSummary.dbCount}개 · 정적 스냅샷 {syncSummary.snapshotCount}개
            </p>
            <p>마지막 스냅샷: {formatSnapshotDate(syncSummary.generatedAt)}</p>
            {syncStatus ? <p>{syncStatus.message}</p> : null}
            {syncRun ? (
              <div className="admin-sync-run">
                <span>{getRunStatusLabel(syncRun)}</span>
                {syncRun.htmlUrl ? (
                  <a
                    href={syncRun.htmlUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    GitHub Actions에서 보기
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="admin-workspace-grid">
        <section
          className="admin-panel admin-workbench-panel"
          ref={workbenchRef}
        >
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
              selectedApp ? startCreate : undefined
            }
            onDirtyChange={setIsFormDirty}
            onDraftChange={(draft) =>
              setDraftPreview((current) => ({ ...current, ...draft }))
            }
            submitLabel={selectedApp ? "수정 저장" : "앱 등록"}
            suggestedTags={currentSuggestedTags}
            suggestedSubjects={librarySubjects}
          />
          {saveStatus ? (
            <p aria-live="polite" className="admin-save-status">
              {saveStatus}
            </p>
          ) : null}
          {selectedApp ? (
            <AdminAppPreview app={selectedApp} draft={draftPreview} />
          ) : null}
        </section>
      <section className="admin-panel admin-library-panel">
        <div className="admin-panel-header">
          <h2>등록된 앱 라이브러리</h2>
          <p>
            compact 카드에서 핵심 정보만 먼저 보고, 편집할 앱을 고르면 위
            워크벤치가 해당 앱 기준으로 전환됩니다.
          </p>
        </div>

        <AdminLibraryControls
          onQueryChange={(value) => {
            setLibraryQuery(value);
            setLibraryPage(1);
          }}
          onSortChange={(value) => {
            setLibrarySort(value);
            setLibraryPage(1);
          }}
          onStatusChange={(value) => {
            setLibraryStatus(value);
            setLibraryPage(1);
          }}
          onSubjectChange={(value) => {
            setLibrarySubject(value);
            setLibraryPage(1);
          }}
          pendingCount={pendingAppIds.size}
          query={libraryQuery}
          resultCount={filteredLibraryApps.length}
          sort={librarySort}
          status={libraryStatus}
          subject={librarySubject}
          subjects={librarySubjects}
        />

        {selectedApps.length > 0 ? (
          <AdminBulkActions
            action={bulkTagAction}
            classificationAction={bulkClassificationAction}
            disabled={isFormDirty}
            onClassificationComplete={applyClassificationUpdates}
            onClear={clearSelection}
            onComplete={applyTagUpdates}
            selectedApps={selectedApps}
          />
        ) : null}

        <AppList
          apps={visibleLibraryApps}
          deleteAction={deleteAction}
          emptyMessage={
            localApps.length > 0 ? "조건에 맞는 앱이 없습니다." : undefined
          }
          onRemoveTag={handleRemoveTag}
          onSelectApp={selectApp}
          onToggleSelection={toggleAppSelection}
          pendingAppIds={pendingAppIds}
          recentChange={recentChange}
          selectedAppIds={selectedAppIds}
          selectedAppId={selectedAppId}
        />

        <AdminLibraryPagination
          currentPage={safeLibraryPage}
          onNext={() =>
            setLibraryPage((current) => Math.min(libraryPageCount, current + 1))
          }
          onPrevious={() =>
            setLibraryPage((current) => Math.max(1, current - 1))
          }
          totalPages={libraryPageCount}
        />
      </section>
      </div>
    </main>
  );
}
