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

const SYNC_REQUEST_MARKER_STORAGE_KEY = "hvc-static-gallery-request-marker";
type StaticGalleryRunScope = "active" | "history" | "request";

export interface AdminSyncStatus {
  kind: "error" | "info" | "success";
  message: string;
}
function readStoredDispatchMarker(): StaticGalleryDispatchMarker | null {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(SYNC_REQUEST_MARKER_STORAGE_KEY) ?? "null"
    ) as Partial<StaticGalleryDispatchMarker> | null;

    if (
      !value ||
      typeof value.id !== "string" ||
      typeof value.requestedAt !== "string" ||
      typeof value.leaseExpiresAt !== "string" ||
      (value.runId !== null && !Number.isSafeInteger(value.runId))
    ) {
      return null;
    }

    return value as StaticGalleryDispatchMarker;
  } catch {
    return null;
  }
}

interface UseAdminSyncArgs {
  apps: AdminAppRecord[];
  assetIntegrity?: StaticGalleryAssetIntegrity;
  baseline: StaticGalleryBaseline;
}

export function useAdminSync({
  apps,
  assetIntegrity,
  baseline
}: UseAdminSyncArgs) {
  const router = useRouter();
  const [syncPending, setSyncPending] = useState(false);
  const [syncStatus, setSyncStatus] = useState<AdminSyncStatus | null>(null);
  const [syncRun, setSyncRun] = useState<StaticGallerySyncRun | null>(null);
  const [dispatchMarker, setDispatchMarker] =
    useState<StaticGalleryDispatchMarker | null>(null);
  const dispatchMarkerRef = useRef<StaticGalleryDispatchMarker | null>(null);
  const requestContextGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const refreshedRunIdRef = useRef<number | null>(null);

  const syncSummary = useMemo(
    () => getStaticGallerySyncSummary(apps, baseline, assetIntegrity),
    [apps, assetIntegrity, baseline]
  );
  const syncRunIsActive = isActiveStaticGalleryRun(syncRun);
  const syncAwaitingRequestedRun = Boolean(dispatchMarker && !syncRun);
  const syncTrackingIsActive = syncAwaitingRequestedRun || syncRunIsActive;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const trackDispatchMarker = useCallback(
    (marker: StaticGalleryDispatchMarker | null, persist = true) => {
      const currentMarkerId = dispatchMarkerRef.current?.id ?? null;
      const nextMarkerId = marker?.id ?? null;

      if (currentMarkerId !== nextMarkerId) {
        requestContextGenerationRef.current += 1;
      }

      dispatchMarkerRef.current = marker;
      setDispatchMarker(marker);

      if (!persist) return;
      if (marker) {
        window.sessionStorage.setItem(
          SYNC_REQUEST_MARKER_STORAGE_KEY,
          JSON.stringify(marker)
        );
      } else {
        window.sessionStorage.removeItem(SYNC_REQUEST_MARKER_STORAGE_KEY);
      }
    },
    []
  );

  const expireTrackedRequest = useCallback(
    (markerId: string) => {
      if (dispatchMarkerRef.current?.id !== markerId) return;

      trackDispatchMarker(null);
      setSyncRun(null);
      setSyncPending(false);
      setSyncStatus({
        kind: "error",
        message: "동기화 요청 확인 시간이 만료되었습니다. 다시 시도해 주세요."
      });
    },
    [trackDispatchMarker]
  );

  const applyLatestRun = useCallback(
    (
      run: StaticGallerySyncRun | null,
      marker: StaticGalleryDispatchMarker | null,
      refreshOnSuccess = false,
      scope: StaticGalleryRunScope = marker ? "active" : "history",
      requestedMarker: StaticGalleryDispatchMarker | null = null
    ) => {
      if (!mountedRef.current) return;

      if (scope === "history") {
        trackDispatchMarker(null);
        setSyncRun(run);
        if (isActiveStaticGalleryRun(run)) {
          setSyncStatus({ kind: "info", message: "최근 동기화 작업이 실행 중입니다." });
        } else if (run) {
          setSyncStatus({ kind: "info", message: "최근 동기화 실행 기록입니다." });
        }
        return;
      }

      const effectiveMarker =
        scope === "request" ? marker ?? requestedMarker : marker;
      trackDispatchMarker(effectiveMarker);
      const requestedRun =
        scope === "request"
          ? run
          : effectiveMarker && effectiveMarker.runId !== null
            ? run?.id === effectiveMarker.runId
              ? run
              : null
            : effectiveMarker
              ? null
              : run;

      if (effectiveMarker && !requestedRun) {
        setSyncRun(null);
        setSyncStatus({ kind: "info", message: "동기화 요청을 확인하는 중입니다." });
        return;
      }

      setSyncRun(requestedRun);
      if (isActiveStaticGalleryRun(requestedRun)) {
        setSyncStatus({ kind: "info", message: "동기화 작업이 실행 중입니다." });
        return;
      }

      if (requestedRun?.conclusion === "success") {
        window.sessionStorage.removeItem(SYNC_REQUEST_MARKER_STORAGE_KEY);
        setSyncStatus({
          kind: "success",
          message: "동기화가 완료되었습니다. 공개 페이지에서 새 내용을 확인해 주세요."
        });
        if (refreshOnSuccess && refreshedRunIdRef.current !== requestedRun.id) {
          refreshedRunIdRef.current = requestedRun.id;
          router.refresh();
        }
      } else if (requestedRun?.conclusion) {
        window.sessionStorage.removeItem(SYNC_REQUEST_MARKER_STORAGE_KEY);
        setSyncStatus({
          kind: "error",
          message: "동기화에 실패했습니다. GitHub Actions 실행 결과를 확인해 주세요."
        });
      }
    },
    [router, trackDispatchMarker]
  );

  const loadLatestRun = useCallback(
    async (
      refreshOnSuccess = false,
      requestedMarker = dispatchMarkerRef.current
    ) => {
      const requestMarkerId = requestedMarker?.id ?? null;
      const requestContextGeneration = requestContextGenerationRef.current;
      const requestContextIsCurrent = () =>
        requestContextGenerationRef.current === requestContextGeneration &&
        (dispatchMarkerRef.current?.id ?? null) === requestMarkerId;

      if (!requestContextIsCurrent()) return;

      try {
        const statusUrl = requestedMarker
          ? `/api/admin/sync-static-gallery?request_marker=${encodeURIComponent(requestedMarker.id)}`
          : "/api/admin/sync-static-gallery";
        const response = await fetch(statusUrl, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          dispatchMarker?: StaticGalleryDispatchMarker | null;
          error?: string;
          requestMarker?: string;
          run?: StaticGallerySyncRun | null;
          scope?: StaticGalleryRunScope;
        };

        if (!requestContextIsCurrent()) return;
        if (!response.ok) {
          throw new Error(payload.error || "동기화 상태를 불러오지 못했습니다.");
        }

        if (requestedMarker && payload.scope) {
          if (
            payload.scope !== "request" ||
            payload.requestMarker !== requestedMarker.id
          ) {
            applyLatestRun(null, requestedMarker, false, "request", requestedMarker);
            return;
          }
          applyLatestRun(
            payload.run ?? null,
            payload.dispatchMarker ?? requestedMarker,
            refreshOnSuccess,
            "request",
            requestedMarker
          );
          return;
        }

        applyLatestRun(
          payload.run ?? null,
          payload.dispatchMarker ?? null,
          refreshOnSuccess,
          payload.scope ?? (payload.dispatchMarker ? "active" : "history"),
          requestedMarker
        );
      } catch (error) {
        if (!mountedRef.current || !requestContextIsCurrent()) return;
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
    const storedMarker = readStoredDispatchMarker();
    if (storedMarker) {
      trackDispatchMarker(storedMarker, false);
      setSyncStatus({ kind: "info", message: "동기화 요청을 확인하는 중입니다." });
      void loadLatestRun(false, storedMarker);
    } else {
      void loadLatestRun();
    }
  }, [loadLatestRun, trackDispatchMarker]);

  useEffect(() => {
    if (!syncTrackingIsActive) return;
    const timer = window.setInterval(() => {
      void loadLatestRun(true, dispatchMarkerRef.current);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadLatestRun, syncTrackingIsActive]);

  useEffect(() => {
    if (!dispatchMarker || syncRun) return;
    const expiresAt = Date.parse(dispatchMarker.leaseExpiresAt);
    const remaining = Number.isFinite(expiresAt)
      ? Math.max(0, expiresAt - Date.now())
      : 0;
    if (remaining === 0) {
      expireTrackedRequest(dispatchMarker.id);
      return;
    }
    const timer = window.setTimeout(() => {
      expireTrackedRequest(dispatchMarker.id);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [dispatchMarker, expireTrackedRequest, syncRun]);

  async function handleStaticGallerySync() {
    setSyncPending(true);
    setSyncStatus(null);
    try {
      const response = await fetch("/api/admin/sync-static-gallery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "admin-sync-button" })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        dispatched?: boolean;
        dispatchMarker?: StaticGalleryDispatchMarker | null;
        error?: string;
        run?: StaticGallerySyncRun | null;
      };

      if (response.status === 409 && payload.run) {
        applyLatestRun(payload.run, payload.dispatchMarker ?? null, false, "active");
        return;
      }
      if (response.status === 409 && payload.dispatchMarker) {
        applyLatestRun(null, payload.dispatchMarker, false, "active");
        return;
      }
      if (!response.ok) {
        throw new Error(payload.error || "동기화 작업을 시작하지 못했습니다.");
      }

      if (payload.dispatched === false) {
        setSyncStatus({ kind: "success", message: "동기화할 수정 사항이 없습니다" });
        router.refresh();
      } else {
        const marker = payload.dispatchMarker ?? null;
        trackDispatchMarker(marker);
        setSyncRun(null);
        setSyncStatus({
          kind: "info",
          message: "동기화 작업을 시작했습니다. 실행 상태를 확인하는 중입니다."
        });
        await loadLatestRun(true, marker);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      trackDispatchMarker(null);
      setSyncRun(null);
      setSyncStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "동기화 작업을 시작하지 못했습니다."
      });
    } finally {
      if (mountedRef.current) setSyncPending(false);
    }
  }

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

  return {
    getRunStatusLabel,
    formatSnapshotDate,
    handleStaticGallerySync,
    syncPending,
    syncRun,
    syncStatus,
    syncSummary,
    syncTrackingIsActive
  };
}
