import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth/session";
import { getAppRepository } from "@/lib/apps/repository";
import {
  acquireStaticGallerySyncLease,
  getActiveStaticGallerySyncLease,
  getStaticGallerySyncLeaseByMarker,
  releaseStaticGallerySyncLease,
  setStaticGallerySyncRun,
  toPublicStaticGalleryDispatchMarker,
  withStaticGallerySyncLeaseDispatchFence,
  type StaticGallerySyncDispatchFenceResult,
  type StaticGallerySyncLease
} from "@/lib/apps/static-gallery-sync-lease";
import {
  ACTIVE_WORKFLOW_STATUSES,
  getStaticGallerySyncSummary,
  type StaticGalleryDispatchMarker,
  type StaticGallerySyncRun
} from "@/lib/apps/static-gallery-sync-state";
import { getStaticGalleryAssetIntegrity } from "@/lib/apps/static-gallery-asset-integrity";
import { getStaticGalleryBaseline } from "@/lib/apps/static-public-apps";
import { isCanonicalGeneratedAt } from "@/lib/apps/static-gallery-snapshot-policy.mjs";

const DEFAULT_GITHUB_OWNER = "WBmaker2";
const DEFAULT_GITHUB_REPO = "vibecoding-lab";
const DEFAULT_WORKFLOW_ID = "sync-static-gallery.yml";
const DEFAULT_SYNC_REF = "main";
const DEFAULT_BASE_URL = "https://www.vivehong.shop";
export const GITHUB_STATUS_TIMEOUT_MS = 8_000;
export const GITHUB_DISPATCH_TIMEOUT_MS = 12_000;

interface GitHubConfig {
  token: string | undefined;
  owner: string;
  repo: string;
  workflowId: string;
  ref: string;
  baseUrl: string;
}

interface WorkflowRunCandidate {
  marker: string | null;
  run: StaticGallerySyncRun;
}

function getConfig(): GitHubConfig {
  return {
    token: process.env.HVC_SYNC_GITHUB_TOKEN?.trim(),
    owner: process.env.HVC_SYNC_GITHUB_OWNER?.trim() || DEFAULT_GITHUB_OWNER,
    repo: process.env.HVC_SYNC_GITHUB_REPO?.trim() || DEFAULT_GITHUB_REPO,
    workflowId:
      process.env.HVC_SYNC_GITHUB_WORKFLOW_ID?.trim() || DEFAULT_WORKFLOW_ID,
    ref: process.env.HVC_SYNC_GITHUB_REF?.trim() || DEFAULT_SYNC_REF,
    baseUrl: process.env.HVC_SYNC_BASE_URL?.trim() || DEFAULT_BASE_URL
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function extractWorkflowMarker(value: Record<string, unknown>) {
  const prefix = "Sync Static Gallery :: ";

  for (const field of ["display_title", "run_name", "name"]) {
    const displayTitle = value[field];

    if (typeof displayTitle === "string" && displayTitle.startsWith(prefix)) {
      const marker = displayTitle.slice(prefix.length).trim();

      if (marker) {
        return marker;
      }
    }
  }

  return null;
}

function normalizeWorkflowRun(value: unknown): WorkflowRunCandidate | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id)
  ) {
    return null;
  }

  return {
    marker: extractWorkflowMarker(value),
    run: {
      id: value.id,
      status: stringOrNull(value.status),
      conclusion: stringOrNull(value.conclusion),
      htmlUrl: stringOrNull(value.html_url),
      createdAt: stringOrNull(value.created_at),
      updatedAt: stringOrNull(value.updated_at)
    }
  };
}

function workflowRunsUrl(config: GitHubConfig): string {
  const params = new URLSearchParams({
    branch: config.ref,
    event: "workflow_dispatch",
    per_page: "30"
  });

  return `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowId}/runs?${params.toString()}`;
}

function workflowDispatchUrl(config: GitHubConfig): string {
  return `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowId}/dispatches`;
}

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function getWorkflowRuns(
  config: GitHubConfig
): Promise<WorkflowRunCandidate[]> {
  const response = await fetchWithTimeout(
    workflowRunsUrl(config),
    {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${config.token}`,
        "x-github-api-version": "2022-11-28"
      }
    },
    GITHUB_STATUS_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`GitHub workflow status failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { workflow_runs?: unknown };

  return Array.isArray(payload.workflow_runs)
      ? payload.workflow_runs
        .map(normalizeWorkflowRun)
        .filter((run): run is WorkflowRunCandidate => run !== null)
    : [];
}

function getLatestWorkflowRun(
  runs: WorkflowRunCandidate[]
): StaticGallerySyncRun | null {
  return runs[0]?.run ?? null;
}

function getRequestedWorkflowRun(
  runs: WorkflowRunCandidate[],
  markerId: string,
  runId: number | null
): StaticGallerySyncRun | null {
  return (
    runs.find(
      (candidate) =>
        candidate.marker === markerId &&
        (runId === null || candidate.run.id === runId)
    )?.run ?? null
  );
}

type RequestMarkerResult =
  | { status: "absent" }
  | { status: "invalid" }
  | { status: "valid"; value: string };

function getRequestMarker(request?: Request): RequestMarkerResult {
  if (!request) {
    return { status: "absent" };
  }

  const searchParams = new URL(request.url).searchParams;

  if (!searchParams.has("request_marker")) {
    return { status: "absent" };
  }

  const marker = searchParams.get("request_marker") ?? "";

  return marker && marker.length <= 128 && /^[a-z0-9-]+$/i.test(marker)
    ? { status: "valid", value: marker }
    : { status: "invalid" };
}

function requestMarkerError() {
  return NextResponse.json(
    {
      code: "SYNC_REQUEST_MARKER_INVALID",
      error: "동기화 요청 marker 형식이 올바르지 않습니다."
    },
    { status: 400 }
  );
}

async function getReason(request: Request) {
  try {
    const payload = (await request.json()) as { reason?: unknown };
    return typeof payload.reason === "string" && payload.reason.trim()
      ? payload.reason.trim().slice(0, 120)
      : "admin-button";
  } catch {
    return "admin-button";
  }
}

function configurationError() {
  return NextResponse.json(
    {
      code: "SYNC_GITHUB_NOT_CONFIGURED",
      error:
        "GitHub workflow dispatch is not configured. Set HVC_SYNC_GITHUB_TOKEN."
    },
    { status: 503 }
  );
}

function summaryError() {
  return NextResponse.json(
    {
      code: "SYNC_SUMMARY_UNAVAILABLE",
      error: "동기화할 앱 목록을 확인하지 못했습니다."
    },
    { status: 503 }
  );
}

function leaseError() {
  return NextResponse.json(
    {
      code: "SYNC_LEASE_UNAVAILABLE",
      error: "동기화 중복 방지 잠금을 사용할 수 없습니다."
    },
    { status: 503 }
  );
}

function leaseOwnershipLostError() {
  return NextResponse.json(
    {
      code: "SYNC_LEASE_OWNERSHIP_LOST",
      error: "동기화 요청 권한이 만료되었습니다. 다시 시도해 주세요."
    },
    { status: 409 }
  );
}

function leaseBusyError() {
  return NextResponse.json(
    {
      code: "SYNC_LEASE_BUSY",
      error: "다른 동기화 요청이 잠금을 확인 중입니다. 잠시 후 다시 시도해 주세요."
    },
    { status: 409 }
  );
}

function statusError() {
  return NextResponse.json(
    {
      code: "SYNC_STATUS_UNAVAILABLE",
      error: "GitHub Actions 실행 상태를 확인하지 못했습니다."
    },
    { status: 502 }
  );
}

function dispatchRejectedError(status: number) {
  return NextResponse.json(
    {
      code: "SYNC_DISPATCH_REJECTED",
      error: `GitHub workflow dispatch was rejected with status ${status}.`,
      outcome: "rejected"
    },
    { status: 502 }
  );
}

function dispatchUncertainResponse(
  lease: StaticGallerySyncLease,
  uncertainty: "commit" | "github-server" | "transport"
) {
  return NextResponse.json(
    {
      code: "SYNC_DISPATCH_UNCERTAIN",
      dispatched: true,
      dispatchMarker: toPublicStaticGalleryDispatchMarker(lease),
      error:
        "GitHub 동기화 요청 결과를 확정하지 못했습니다. 실행 상태를 확인합니다.",
      outcome: "uncertain",
      uncertainty
    },
    { status: 202 }
  );
}

async function releaseSafely(leaseToken: string) {
  try {
    await releaseStaticGallerySyncLease(leaseToken);
  } catch {
    // Preserve the original failure response; the bounded lease remains the fallback.
  }
}

export async function GET(request?: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestMarkerResult = getRequestMarker(request);

  if (requestMarkerResult.status === "invalid") {
    return requestMarkerError();
  }

  const requestMarker =
    requestMarkerResult.status === "valid" ? requestMarkerResult.value : null;

  const config = getConfig();

  if (!config.token) {
    return configurationError();
  }

  let lease: StaticGallerySyncLease | null;

  try {
    lease = requestMarker
      ? await getStaticGallerySyncLeaseByMarker(requestMarker)
      : await getActiveStaticGallerySyncLease();
  } catch {
    return leaseError();
  }

  let runs: WorkflowRunCandidate[];

  try {
    runs = await getWorkflowRuns(config);
  } catch {
    return statusError();
  }

  const run = requestMarker
    ? getRequestedWorkflowRun(runs, requestMarker, lease?.runId ?? null)
    : lease
      ? getRequestedWorkflowRun(runs, lease.id, lease.runId)
      : getLatestWorkflowRun(runs);

  if (lease && run && lease.runId !== run.id) {
    try {
      lease = (await setStaticGallerySyncRun(lease.leaseToken, run.id)) ?? lease;
    } catch {
      return leaseError();
    }
  }

  const dispatchMarker: StaticGalleryDispatchMarker | null = lease
    ? toPublicStaticGalleryDispatchMarker(lease)
    : null;

  if (
    lease &&
    run &&
    lease.runId === run.id &&
    run.status === "completed" &&
    run.conclusion
  ) {
    await releaseSafely(lease.leaseToken);
  }

  return NextResponse.json({
    run,
    dispatchMarker,
    scope: requestMarker ? "request" : lease ? "active" : "history",
    ...(requestMarker ? { requestMarker } : {})
  });
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseline = getStaticGalleryBaseline();
  let summary: Awaited<ReturnType<typeof getStaticGallerySyncSummary>>;
  let catalogRevision: number | null = null;

  try {
    const repo = getAppRepository();
    const assetIntegrity = await getStaticGalleryAssetIntegrity(baseline);
    if (repo.getCatalogRevision) {
      try {
        catalogRevision = await repo.getCatalogRevision();
      } catch {
        catalogRevision = null;
      }
    }

    const revisionMatchesSnapshot =
      catalogRevision !== null &&
      baseline.catalogRevision === catalogRevision &&
      isCanonicalGeneratedAt(baseline.generatedAt) &&
      assetIntegrity.valid;

    if (revisionMatchesSnapshot) {
      return NextResponse.json({ dispatched: false });
    }

    const apps = await repo.listAdminApps();
    summary = getStaticGallerySyncSummary(apps, baseline, assetIntegrity);
  } catch {
    return summaryError();
  }

  const revisionNeedsSync =
    catalogRevision !== null &&
    baseline.catalogRevision !== catalogRevision;

  if (summary.pendingCount === 0 && !revisionNeedsSync) {
    return NextResponse.json({ dispatched: false });
  }

  const config = getConfig();

  if (!config.token) {
    return configurationError();
  }

  let lease: StaticGallerySyncLease | null;

  try {
    lease = await acquireStaticGallerySyncLease();
  } catch {
    return leaseError();
  }

  if (!lease) {
    let activeLease: StaticGallerySyncLease | null = null;

    try {
      activeLease = await getActiveStaticGallerySyncLease();
    } catch {
      return leaseError();
    }

    return NextResponse.json(
      {
        code: "SYNC_ALREADY_REQUESTED",
        dispatchMarker: activeLease
          ? toPublicStaticGalleryDispatchMarker(activeLease)
          : null,
        error: "이미 동기화 작업이 요청되었거나 실행 중입니다."
      },
      { status: 409 }
    );
  }

  const acquiredLease = lease;

  let latestRun: StaticGallerySyncRun | null;

  try {
    latestRun = getLatestWorkflowRun(await getWorkflowRuns(config));
  } catch {
    await releaseSafely(lease.leaseToken);
    return statusError();
  }

  if (latestRun?.status && ACTIVE_WORKFLOW_STATUSES.has(latestRun.status)) {
    await releaseSafely(lease.leaseToken);

    return NextResponse.json(
      {
        code: "SYNC_ALREADY_RUNNING",
        error: "이미 실행 중인 동기화 작업이 있습니다.",
        run: latestRun
      },
      { status: 409 }
    );
  }

  const reason = await getReason(request);
  let fencedDispatch: StaticGallerySyncDispatchFenceResult<Response>;

  try {
    fencedDispatch = await withStaticGallerySyncLeaseDispatchFence(
      acquiredLease.leaseToken,
      latestRun?.id ?? null,
      async () =>
        fetchWithTimeout(
          workflowDispatchUrl(config),
          {
            method: "POST",
            headers: {
              accept: "application/vnd.github+json",
              authorization: `Bearer ${config.token}`,
              "content-type": "application/json",
              "x-github-api-version": "2022-11-28"
            },
            body: JSON.stringify({
              ref: config.ref,
              inputs: {
                base_url: config.baseUrl,
                reason,
                request_marker: acquiredLease.id
              }
            })
          },
          GITHUB_DISPATCH_TIMEOUT_MS
        )
    );
  } catch {
    await releaseSafely(acquiredLease.leaseToken);
    return leaseError();
  }

  if (fencedDispatch.status === "ownership_lost") {
    return leaseOwnershipLostError();
  }

  if (fencedDispatch.status === "lock_unavailable") {
    await releaseSafely(lease.leaseToken);
    return leaseBusyError();
  }

  lease = fencedDispatch.lease;

  if (fencedDispatch.status === "dispatch_uncertain") {
    return dispatchUncertainResponse(lease, fencedDispatch.phase);
  }

  const response = fencedDispatch.result;

  if (response.ok) {
    return NextResponse.json(
      {
        dispatched: true,
        dispatchMarker: toPublicStaticGalleryDispatchMarker(lease)
      },
      { status: 202 }
    );
  }

  if (response.status >= 400 && response.status < 500) {
    await releaseSafely(lease.leaseToken);
    return dispatchRejectedError(response.status);
  }

  return dispatchUncertainResponse(lease, "github-server");
}
