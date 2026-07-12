"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminAppRecord } from "@/lib/apps/types";
import {
  getStaticGallerySyncSummary,
  isActiveStaticGalleryRun,
  type StaticGalleryAssetIntegrity,
  type StaticGalleryBaseline,
  type StaticGalleryDispatchMarker,
  type StaticGallerySyncRun
} from "@/lib/apps/static-gallery-sync-state";
import {
  buildAdminAppPreviewFromFormData,
  getChangedAdminFieldLabels,
  type RecentAdminChange
} from "./change-highlights";
import { AppForm } from "./app-form";
import { AppList } from "./app-list";

interface AdminWorkspaceProps {
  assetIntegrity?: StaticGalleryAssetIntegrity;
  apps: AdminAppRecord[];
  baseline: StaticGalleryBaseline;
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
  createAction,
  deleteAction,
  logoutAction,
  removeTagAction,
  suggestedTags,
  updateAction
}: AdminWorkspaceProps) {
  const router = useRouter();
  const [localApps, setLocalApps] = useState(apps);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [recentChange, setRecentChange] = useState<RecentAdminChange | null>(
    null
  );
  const [syncPending, setSyncPending] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    kind: "error" | "info" | "success";
    message: string;
  } | null>(null);
  const [syncRun, setSyncRun] = useState<StaticGallerySyncRun | null>(null);
  const [dispatchMarker, setDispatchMarker] =
    useState<StaticGalleryDispatchMarker | null>(null);
  const mountedRef = useRef(true);
  const refreshedRunIdRef = useRef<number | null>(null);

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

  const syncSummary = useMemo(
    () => getStaticGallerySyncSummary(localApps, baseline, assetIntegrity),
    [assetIntegrity, baseline, localApps]
  );

  const syncRunIsActive = isActiveStaticGalleryRun(syncRun);
  const syncAwaitingRequestedRun = Boolean(
    dispatchMarker &&
      (!dispatchMarker.runId || !syncRun || syncRun.id !== dispatchMarker.runId)
  );
  const syncTrackingIsActive = syncAwaitingRequestedRun || syncRunIsActive;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyLatestRun = useCallback(
    (
      run: StaticGallerySyncRun | null,
      marker: StaticGalleryDispatchMarker | null,
      refreshOnSuccess = false
    ) => {
      if (!mountedRef.current) {
        return;
      }

      setDispatchMarker(marker);

      const requestedRun =
        marker && marker.runId !== null
          ? run?.id === marker.runId
            ? run
            : null
          : marker
            ? null
            : run;

      if (marker && !requestedRun) {
        setSyncRun(null);
        setSyncStatus({
          kind: "info",
          message: "동기화 요청을 확인하는 중입니다."
        });
        return;
      }

      setSyncRun(requestedRun);

      if (isActiveStaticGalleryRun(requestedRun)) {
        setSyncStatus({
          kind: "info",
          message: "동기화 작업이 실행 중입니다."
        });
        return;
      }

      if (requestedRun?.conclusion === "success") {
        setSyncStatus({
          kind: "success",
          message: "동기화가 완료되었습니다."
        });

        if (
          refreshOnSuccess &&
          refreshedRunIdRef.current !== requestedRun.id
        ) {
          refreshedRunIdRef.current = requestedRun.id;
          router.refresh();
        }
      } else if (requestedRun?.conclusion) {
        setSyncStatus({
          kind: "error",
          message: "동기화에 실패했습니다. GitHub Actions 실행 결과를 확인해 주세요."
        });
      }
    },
    [router]
  );

  const loadLatestRun = useCallback(
    async (refreshOnSuccess = false) => {
      try {
        const response = await fetch("/api/admin/sync-static-gallery", {
          cache: "no-store"
        });
        const payload = (await response.json().catch(() => ({}))) as {
          dispatchMarker?: StaticGalleryDispatchMarker | null;
          error?: string;
          run?: StaticGallerySyncRun | null;
        };

        if (!response.ok) {
          throw new Error(payload.error || "동기화 상태를 불러오지 못했습니다.");
        }

        applyLatestRun(
          payload.run ?? null,
          payload.dispatchMarker ?? null,
          refreshOnSuccess
        );
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        setSyncStatus({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "동기화 상태를 불러오지 못했습니다."
        });
      }
    },
    [applyLatestRun]
  );

  useEffect(() => {
    void loadLatestRun();
  }, [loadLatestRun]);

  useEffect(() => {
    if (!syncTrackingIsActive) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadLatestRun(true);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadLatestRun, syncTrackingIsActive]);

  function formatSnapshotDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "알 수 없음"
      : date.toLocaleDateString("ko-KR");
  }

  function getRunStatusLabel(run: StaticGallerySyncRun) {
    const statusLabels: Record<string, string> = {
      completed: "완료",
      in_progress: "실행 중",
      pending: "보류 중",
      queued: "대기 중",
      requested: "요청됨",
      waiting: "대기 중"
    };
    const conclusionLabels: Record<string, string> = {
      cancelled: "취소됨",
      failure: "실패",
      neutral: "중립",
      success: "성공",
      skipped: "건너뜀",
      timed_out: "시간 초과"
    };
    const status = run.status
      ? (statusLabels[run.status] ?? run.status)
      : "알 수 없음";
    const conclusion = run.conclusion
      ? (conclusionLabels[run.conclusion] ?? run.conclusion)
      : "진행 중";

    return `상태 ${status} · 결과 ${conclusion}`;
  }

  const currentSuggestedTags = useMemo(() => {
    const tags = [...new Set(localApps.flatMap((app) => app.tags))].sort(
      (left, right) => left.localeCompare(right, "ko")
    );

    return tags.length > 0 ? tags : suggestedTags;
  }, [localApps, suggestedTags]);

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

  async function handleStaticGallerySync() {
    setSyncPending(true);
    setSyncStatus(null);

    try {
      const response = await fetch("/api/admin/sync-static-gallery", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          reason: "admin-sync-button"
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        dispatched?: boolean;
        dispatchMarker?: StaticGalleryDispatchMarker | null;
        error?: string;
        run?: StaticGallerySyncRun | null;
      };

      if (response.status === 409 && payload.run) {
        applyLatestRun(payload.run, payload.dispatchMarker ?? null);
        return;
      }

      if (response.status === 409 && payload.dispatchMarker) {
        applyLatestRun(null, payload.dispatchMarker);
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.error || "동기화 작업을 시작하지 못했습니다."
        );
      }

      if (payload.dispatched === false) {
        setSyncStatus({
          kind: "success",
          message: "동기화할 수정 사항이 없습니다"
        });
        router.refresh();
      } else {
        setDispatchMarker(payload.dispatchMarker ?? null);
        setSyncRun(null);
        setSyncStatus({
          kind: "info",
          message: "동기화 작업을 시작했습니다. 실행 상태를 확인하는 중입니다."
        });
        await loadLatestRun(true);
      }
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setSyncStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "동기화 작업을 시작하지 못했습니다."
      });
    } finally {
      if (mountedRef.current) {
        setSyncPending(false);
      }
    }
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
          </div>

          <div className="admin-header-actions">
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
            suggestedTags={currentSuggestedTags}
          />
        </section>
      </div>

      <section className="admin-panel admin-library-panel">
        <div className="admin-panel-header">
          <h2>등록된 앱 라이브러리</h2>
          <p>
            compact 카드에서 핵심 정보만 먼저 보고, 편집할 앱을 고르면 위
            워크벤치가 해당 앱 기준으로 전환됩니다.
          </p>
        </div>

        <AppList
          apps={localApps}
          deleteAction={deleteAction}
          onRemoveTag={handleRemoveTag}
          onSelectApp={setSelectedAppId}
          recentChange={recentChange}
          selectedAppId={selectedAppId}
        />
      </section>
    </main>
  );
}
