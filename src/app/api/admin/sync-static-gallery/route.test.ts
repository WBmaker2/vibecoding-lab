import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  acquireStaticGallerySyncLeaseMock,
  getAppRepositoryMock,
  getActiveStaticGallerySyncLeaseMock,
  getStaticGallerySyncLeaseByMarkerMock,
  getStaticGalleryAssetIntegrityMock,
  getStaticGalleryBaselineMock,
  getStaticGallerySyncSummaryMock,
  hasAdminSessionMock,
  listAdminAppsMock,
  releaseStaticGallerySyncLeaseMock,
  setStaticGallerySyncRunMock,
  toPublicStaticGalleryDispatchMarkerMock,
  withStaticGallerySyncLeaseDispatchFenceMock
} = vi.hoisted(() => ({
  acquireStaticGallerySyncLeaseMock: vi.fn(),
  getAppRepositoryMock: vi.fn(),
  getActiveStaticGallerySyncLeaseMock: vi.fn(),
  getStaticGallerySyncLeaseByMarkerMock: vi.fn(),
  getStaticGalleryBaselineMock: vi.fn(),
  getStaticGalleryAssetIntegrityMock: vi.fn(),
  getStaticGallerySyncSummaryMock: vi.fn(),
  hasAdminSessionMock: vi.fn(),
  listAdminAppsMock: vi.fn(),
  releaseStaticGallerySyncLeaseMock: vi.fn(),
  setStaticGallerySyncRunMock: vi.fn(),
  toPublicStaticGalleryDispatchMarkerMock: vi.fn(),
  withStaticGallerySyncLeaseDispatchFenceMock: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  hasAdminSession: hasAdminSessionMock
}));

vi.mock("@/lib/apps/repository", () => ({
  getAppRepository: getAppRepositoryMock
}));

vi.mock("@/lib/apps/static-gallery-sync-lease", () => ({
  acquireStaticGallerySyncLease: acquireStaticGallerySyncLeaseMock,
  getActiveStaticGallerySyncLease: getActiveStaticGallerySyncLeaseMock,
  getStaticGallerySyncLeaseByMarker: getStaticGallerySyncLeaseByMarkerMock,
  releaseStaticGallerySyncLease: releaseStaticGallerySyncLeaseMock,
  setStaticGallerySyncRun: setStaticGallerySyncRunMock,
  toPublicStaticGalleryDispatchMarker: toPublicStaticGalleryDispatchMarkerMock,
  withStaticGallerySyncLeaseDispatchFence:
    withStaticGallerySyncLeaseDispatchFenceMock
}));

vi.mock("@/lib/apps/static-public-apps", () => ({
  getStaticGalleryBaseline: getStaticGalleryBaselineMock
}));

vi.mock("@/lib/apps/static-gallery-asset-integrity", () => ({
  getStaticGalleryAssetIntegrity: getStaticGalleryAssetIntegrityMock
}));

vi.mock("@/lib/apps/static-gallery-sync-state", () => ({
  ACTIVE_WORKFLOW_STATUSES: new Set([
    "queued",
    "in_progress",
    "waiting",
    "requested",
    "pending"
  ]),
  getStaticGallerySyncSummary: getStaticGallerySyncSummaryMock
}));

import {
  GET,
  GITHUB_DISPATCH_TIMEOUT_MS,
  GITHUB_STATUS_TIMEOUT_MS,
  POST
} from "./route";

const originalEnv = { ...process.env };
const summary = {
  pendingCount: 2,
  dbCount: 2,
  snapshotCount: 1,
  generatedAt: "2026-07-10T00:00:00.000Z"
};

const lease = {
  leaseToken: "secret-lease-token",
  id: "marker-123",
  requestedAt: "2026-07-10T03:00:00.000Z",
  leaseExpiresAt: "2026-07-10T03:30:00.000Z",
  previousRunId: null as number | null,
  runId: null as number | null
};

const publicMarker = {
  id: lease.id,
  requestedAt: lease.requestedAt,
  leaseExpiresAt: "2026-07-10T04:00:00.000Z",
  runId: null
};

function uncertainPayload(
  uncertainty: "commit" | "github-server" | "transport"
) {
  return {
    code: "SYNC_DISPATCH_UNCERTAIN",
    dispatched: true,
    dispatchMarker: publicMarker,
    error:
      "GitHub 동기화 요청 결과를 확정하지 못했습니다. 실행 상태를 확인합니다.",
    outcome: "uncertain",
    uncertainty
  };
}

function request(
  method: "GET" | "POST" = "POST",
  requestMarker?: string
) {
  const url = new URL("http://localhost/api/admin/sync-static-gallery");

  if (requestMarker) {
    url.searchParams.set("request_marker", requestMarker);
  }

  return new Request(url, {
    method,
    body: method === "POST" ? JSON.stringify({ reason: "button click" }) : undefined
  });
}

function rejectWhenAborted(init?: RequestInit): Promise<Response> {
  return new Promise((_, reject) => {
    const abort = () => reject(new DOMException("aborted", "AbortError"));

    if (init?.signal?.aborted) {
      abort();
      return;
    }

    init?.signal?.addEventListener("abort", abort, { once: true });
  });
}

async function flushAsyncWork() {
  for (let index = 0; index < 30; index += 1) {
    await Promise.resolve();
  }
}

describe("/api/admin/sync-static-gallery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hasAdminSessionMock.mockReset();
    getAppRepositoryMock.mockReset();
    getStaticGalleryBaselineMock.mockReset();
    getStaticGalleryAssetIntegrityMock.mockReset();
    getStaticGallerySyncSummaryMock.mockReset();
    listAdminAppsMock.mockReset();
    process.env = { ...originalEnv };
    delete process.env.HVC_SYNC_GITHUB_TOKEN;
    delete process.env.HVC_SYNC_GITHUB_OWNER;
    delete process.env.HVC_SYNC_GITHUB_REPO;
    delete process.env.HVC_SYNC_GITHUB_WORKFLOW_ID;
    delete process.env.HVC_SYNC_GITHUB_REF;
    delete process.env.HVC_SYNC_BASE_URL;
    getAppRepositoryMock.mockReturnValue({ listAdminApps: listAdminAppsMock });
    listAdminAppsMock.mockResolvedValue([]);
    getStaticGalleryBaselineMock.mockReturnValue({
      assetManifest: [],
      generatedAt: summary.generatedAt,
      appCount: 1,
      updatedAtById: {}
    });
    getStaticGalleryAssetIntegrityMock.mockResolvedValue({
      valid: true,
      reason: "assets-match"
    });
    getStaticGallerySyncSummaryMock.mockReturnValue(summary);
    acquireStaticGallerySyncLeaseMock.mockResolvedValue({ ...lease });
    getActiveStaticGallerySyncLeaseMock.mockResolvedValue(null);
    getStaticGallerySyncLeaseByMarkerMock.mockReset();
    getStaticGallerySyncLeaseByMarkerMock.mockResolvedValue(null);
    releaseStaticGallerySyncLeaseMock.mockResolvedValue(undefined);
    withStaticGallerySyncLeaseDispatchFenceMock.mockImplementation(
      async (
        token: string,
        previousRunId: number | null,
        dispatch: (renewedLease: typeof lease) => Promise<Response>
      ) => {
        const renewedLease = {
          ...lease,
          leaseToken: token,
          previousRunId,
          leaseExpiresAt: "2026-07-10T04:00:00.000Z"
        };

        try {
          return {
            status: "completed",
            lease: renewedLease,
            result: await dispatch(renewedLease)
          };
        } catch {
          return {
            status: "dispatch_uncertain",
            phase: "transport",
            lease: renewedLease
          };
        }
      }
    );
    setStaticGallerySyncRunMock.mockImplementation(async (token: string, runId: number) => ({
      ...lease,
      leaseToken: token,
      runId
    }));
    toPublicStaticGalleryDispatchMarkerMock.mockImplementation((value: typeof lease) => ({
      id: value.id,
      requestedAt: value.requestedAt,
      leaseExpiresAt: value.leaseExpiresAt,
      runId: value.runId
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects unauthenticated GET before repository or GitHub work", async () => {
    hasAdminSessionMock.mockResolvedValue(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getAppRepositoryMock).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["", "bad marker", "marker/../run", "x".repeat(129)])(
    "rejects a malformed request marker with structured 400: %s",
    async (requestMarker) => {
      hasAdminSessionMock.mockResolvedValue(true);
      const url = new URL("http://localhost/api/admin/sync-static-gallery");
      url.searchParams.set("request_marker", requestMarker);
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const response = await GET(new Request(url));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        code: "SYNC_REQUEST_MARKER_INVALID",
        error: "동기화 요청 marker 형식이 올바르지 않습니다."
      });
      expect(getActiveStaticGallerySyncLeaseMock).not.toHaveBeenCalled();
      expect(getStaticGallerySyncLeaseByMarkerMock).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  );

  it("returns only normalized fields for the latest workflow run", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              id: 123,
              status: "completed",
              conclusion: "success",
              html_url: "https://github.com/WBmaker2/vibecoding-lab/actions/runs/123",
              created_at: "2026-07-10T01:00:00.000Z",
              updated_at: "2026-07-10T01:02:00.000Z",
              display_title: "Sync Static Gallery :: unrelated-marker",
              run_attempt: 4,
              token: "must-not-leak"
            }
          ]
        }),
        { status: 200 }
      )
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      dispatchMarker: null,
      scope: "history",
      run: {
        id: 123,
        status: "completed",
        conclusion: "success",
        htmlUrl:
          "https://github.com/WBmaker2/vibecoding-lab/actions/runs/123",
        createdAt: "2026-07-10T01:00:00.000Z",
        updatedAt: "2026-07-10T01:02:00.000Z"
      }
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/WBmaker2/vibecoding-lab/actions/workflows/sync-static-gallery.yml/runs?branch=codex%2Fhongs-vibe-coding-lab&event=workflow_dispatch&per_page=30",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          authorization: "Bearer test-token"
        })
      })
    );
  });

  it("returns a no-op without reading configuration or calling GitHub", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    getStaticGallerySyncSummaryMock.mockReturnValue({
      ...summary,
      pendingCount: 0
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ dispatched: false });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(listAdminAppsMock).toHaveBeenCalledOnce();
  });

  it("rejects a changed request when the latest workflow run is active", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const activeRun = {
      id: 456,
      status: "in_progress",
      conclusion: null,
      htmlUrl: "https://github.com/WBmaker2/vibecoding-lab/actions/runs/456",
      createdAt: "2026-07-10T02:00:00.000Z",
      updatedAt: "2026-07-10T02:01:00.000Z"
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ workflow_runs: [
        {
          id: activeRun.id,
          status: activeRun.status,
          conclusion: activeRun.conclusion,
          html_url: activeRun.htmlUrl,
          created_at: activeRun.createdAt,
          updated_at: activeRun.updatedAt
        }
      ] }), { status: 200 })
    );

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "SYNC_ALREADY_RUNNING",
      error: "이미 실행 중인 동기화 작업이 있습니다.",
      run: activeRun
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(releaseStaticGallerySyncLeaseMock).toHaveBeenCalledWith(
      lease.leaseToken
    );
  });

  it("dispatches changed work only after an idle latest-run check", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      dispatched: true,
      dispatchMarker: publicMarker
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/WBmaker2/vibecoding-lab/actions/workflows/sync-static-gallery.yml/dispatches",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-token"
        }),
        body: expect.stringContaining('"request_marker":"marker-123"')
      })
    );
  });

  it("rejects a stale lease owner before GitHub dispatch", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    withStaticGallerySyncLeaseDispatchFenceMock.mockResolvedValue({
      status: "ownership_lost"
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 })
    );

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "SYNC_LEASE_OWNERSHIP_LOST",
      error: "동기화 요청 권한이 만료되었습니다. 다시 시도해 주세요."
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")
    ).toHaveLength(0);
  });

  it("fails fast when the final advisory lock is unavailable", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    withStaticGallerySyncLeaseDispatchFenceMock.mockResolvedValue({
      status: "lock_unavailable"
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 })
    );

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "SYNC_LEASE_BUSY",
      error: "다른 동기화 요청이 잠금을 확인 중입니다. 잠시 후 다시 시도해 주세요."
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")
    ).toHaveLength(0);
    expect(releaseStaticGallerySyncLeaseMock).toHaveBeenCalledWith(
      lease.leaseToken
    );
  });

  it("dispatches only once when two changed POST calls race", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const secondLease = { ...lease, id: "marker-456" };
    acquireStaticGallerySyncLeaseMock
      .mockImplementationOnce(async () => ({ ...lease }))
      .mockImplementationOnce(async () => null);
    getActiveStaticGallerySyncLeaseMock.mockResolvedValue({ ...lease });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const [first, second] = await Promise.all([POST(request()), POST(request())]);

    expect([first.status, second.status].sort()).toEqual([202, 409]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(secondLease.id).not.toBe(lease.id);
  });

  it("releases the lease when the pre-dispatch status check fails", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: "SYNC_STATUS_UNAVAILABLE",
      error: "GitHub Actions 실행 상태를 확인하지 못했습니다."
    });
    expect(releaseStaticGallerySyncLeaseMock).toHaveBeenCalledWith(
      lease.leaseToken
    );
  });

  it("aborts a timed-out pre-dispatch status check and releases the lease", async () => {
    vi.useFakeTimers();
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_input, init) => rejectWhenAborted(init));

    const responsePromise = POST(request());
    await flushAsyncWork();
    expect(fetchMock).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(GITHUB_STATUS_TIMEOUT_MS);
    const response = await responsePromise;

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: "SYNC_STATUS_UNAVAILABLE",
      error: "GitHub Actions 실행 상태를 확인하지 못했습니다."
    });
    expect(releaseStaticGallerySyncLeaseMock).toHaveBeenCalledWith(
      lease.leaseToken
    );
  });

  it("preserves the marker when dispatch times out ambiguously", async () => {
    vi.useFakeTimers();
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 })
      )
      .mockImplementationOnce((_input, init) => rejectWhenAborted(init));

    const responsePromise = POST(request());
    await flushAsyncWork();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(GITHUB_DISPATCH_TIMEOUT_MS);
    const response = await responsePromise;

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(uncertainPayload("transport"));
    expect(releaseStaticGallerySyncLeaseMock).not.toHaveBeenCalled();
  });

  it("preserves the marker when dispatch fails with a network ambiguity", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 })
      )
      .mockRejectedValueOnce(new TypeError("socket closed"));

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(uncertainPayload("transport"));
    expect(releaseStaticGallerySyncLeaseMock).not.toHaveBeenCalled();
  });

  it("preserves the marker for an ambiguous GitHub 5xx", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(uncertainPayload("github-server"));
    expect(releaseStaticGallerySyncLeaseMock).not.toHaveBeenCalled();
  });

  it("releases the lease for an explicit GitHub 4xx rejection", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(null, { status: 422 }));

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: "SYNC_DISPATCH_REJECTED",
      error: "GitHub workflow dispatch was rejected with status 422.",
      outcome: "rejected"
    });
    expect(releaseStaticGallerySyncLeaseMock).toHaveBeenCalledWith(
      lease.leaseToken
    );
  });

  it("preserves the marker when accepted dispatch is followed by commit failure", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    withStaticGallerySyncLeaseDispatchFenceMock.mockImplementation(
      async (
        token: string,
        previousRunId: number | null,
        dispatch: (renewedLease: typeof lease) => Promise<Response>
      ) => {
        const renewedLease = {
          ...lease,
          leaseToken: token,
          previousRunId,
          leaseExpiresAt: publicMarker.leaseExpiresAt
        };
        const result = await dispatch(renewedLease);

        return {
          status: "dispatch_uncertain",
          phase: "commit",
          lease: renewedLease,
          result
        };
      }
    );
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(uncertainPayload("commit"));
    expect(releaseStaticGallerySyncLeaseMock).not.toHaveBeenCalled();
  });

  it("returns a structured summary error when Postgres-backed app loading fails", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    listAdminAppsMock.mockRejectedValue(new Error("postgres unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "SYNC_SUMMARY_UNAVAILABLE",
      error: "동기화할 앱 목록을 확인하지 못했습니다."
    });
    expect(acquireStaticGallerySyncLeaseMock).not.toHaveBeenCalled();
  });

  it("never accepts previousRunId even when its timestamp is in the request second", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const activeLease = {
      ...lease,
      previousRunId: 700,
      requestedAt: "2026-07-10T03:00:00.750Z"
    };
    getActiveStaticGallerySyncLeaseMock.mockResolvedValue(activeLease);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              id: 700,
              status: "completed",
              conclusion: "success",
              html_url: "https://github.com/runs/700",
              created_at: "2026-07-10T03:00:00.000Z",
              updated_at: "2026-07-10T03:00:00.000Z",
              token: "must-not-leak"
            }
          ]
        }),
        { status: 200 }
      )
    );

    const response = await GET();

    expect(await response.json()).toEqual({
      run: null,
      scope: "active",
      dispatchMarker: {
        id: activeLease.id,
        requestedAt: activeLease.requestedAt,
        leaseExpiresAt: activeLease.leaseExpiresAt,
        runId: null
      }
    });
    expect(setStaticGallerySyncRunMock).not.toHaveBeenCalled();
  });

  it("matches a run only when its public display marker exactly matches", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const activeLease = {
      ...lease,
      previousRunId: 700,
      requestedAt: "2026-07-10T03:00:59.750Z"
    };
    getActiveStaticGallerySyncLeaseMock.mockResolvedValue(activeLease);
    setStaticGallerySyncRunMock.mockResolvedValue({ ...activeLease, runId: 701 });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              id: 701,
              status: "in_progress",
              conclusion: null,
              html_url: "https://github.com/runs/701",
              display_title: "Sync Static Gallery :: marker-123",
              created_at: "2026-07-10T03:00:00.000Z",
              updated_at: "2026-07-10T03:00:00.000Z"
            }
          ]
        }),
        { status: 200 }
      )
    );

    const response = await GET();
    const payload = await response.json();

    expect(payload.run.id).toBe(701);
    expect(payload.scope).toBe("active");
    expect(payload.dispatchMarker.runId).toBe(701);
    expect(setStaticGallerySyncRunMock).toHaveBeenCalledWith(
      activeLease.leaseToken,
      701
    );
  });

  it("keeps an unmatched marker unknown instead of adopting the latest run", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const activeLease = { ...lease, previousRunId: 700 };
    getActiveStaticGallerySyncLeaseMock.mockResolvedValue(activeLease);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              id: 702,
              status: "completed",
              conclusion: "success",
              html_url: "https://github.com/runs/702",
              display_title: "Sync Static Gallery :: another-marker",
              created_at: "2026-07-10T03:01:00.000Z",
              updated_at: "2026-07-10T03:02:00.000Z"
            }
          ]
        }),
        { status: 200 }
      )
    );

    const response = await GET();

    expect(await response.json()).toMatchObject({
      run: null,
      dispatchMarker: expect.objectContaining({ id: activeLease.id })
    });
    expect(setStaticGallerySyncRunMock).not.toHaveBeenCalled();
  });

  it("matches an expired requested marker behind an unrelated latest run", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const expiredLease = {
      ...lease,
      leaseExpiresAt: "2026-07-10T02:30:00.000Z"
    };
    getStaticGallerySyncLeaseByMarkerMock.mockResolvedValue(expiredLease);
    setStaticGallerySyncRunMock.mockResolvedValue(null);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              id: 702,
              status: "completed",
              conclusion: "success",
              html_url: "https://github.com/runs/702",
              display_title: "Sync Static Gallery :: another-marker",
              created_at: "2026-07-10T03:01:00.000Z",
              updated_at: "2026-07-10T03:02:00.000Z"
            },
            {
              id: 701,
              status: "completed",
              conclusion: "success",
              html_url: "https://github.com/runs/701",
              display_title: "Sync Static Gallery :: marker-123",
              created_at: "2026-07-10T03:00:00.000Z",
              updated_at: "2026-07-10T03:01:00.000Z"
            }
          ]
        }),
        { status: 200 }
      )
    );

    const response = await GET(request("GET", expiredLease.id));
    const payload = await response.json();

    expect(payload).toMatchObject({
      scope: "request",
      requestMarker: expiredLease.id,
      run: { id: 701 },
      dispatchMarker: { id: expiredLease.id }
    });
    expect(JSON.stringify(payload)).not.toContain(expiredLease.leaseToken);
    expect(getStaticGallerySyncLeaseByMarkerMock).toHaveBeenCalledWith(
      expiredLease.id
    );
  });

  it("keeps an expired unmatched marker unknown", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const expiredLease = {
      ...lease,
      leaseExpiresAt: "2026-07-10T02:30:00.000Z"
    };
    getStaticGallerySyncLeaseByMarkerMock.mockResolvedValue(expiredLease);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              id: 702,
              status: "completed",
              conclusion: "success",
              html_url: "https://github.com/runs/702",
              display_title: "Sync Static Gallery :: another-marker",
              created_at: "2026-07-10T03:01:00.000Z",
              updated_at: "2026-07-10T03:02:00.000Z"
            }
          ]
        }),
        { status: 200 }
      )
    );

    const response = await GET(request("GET", expiredLease.id));

    expect(await response.json()).toMatchObject({
      scope: "request",
      requestMarker: expiredLease.id,
      run: null,
      dispatchMarker: { id: expiredLease.id }
    });
    expect(setStaticGallerySyncRunMock).not.toHaveBeenCalled();
  });

  it("releases the marker after the requested run reaches a terminal state", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const activeLease = { ...lease, previousRunId: 700 };
    const completedRun = {
            id: 701,
            status: "completed",
            conclusion: "success",
            html_url: "https://github.com/runs/701",
            display_title: "Sync Static Gallery :: marker-123",
            created_at: "2026-07-10T03:01:00.000Z",
      updated_at: "2026-07-10T03:02:00.000Z"
    };
    getActiveStaticGallerySyncLeaseMock.mockResolvedValue(activeLease);
    setStaticGallerySyncRunMock.mockResolvedValue({ ...activeLease, runId: 701 });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ workflow_runs: [completedRun] }), {
        status: 200
      })
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(releaseStaticGallerySyncLeaseMock).toHaveBeenCalledWith(
      activeLease.leaseToken
    );
  });

  it("allows a later acquire after the durable lease has expired", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    acquireStaticGallerySyncLeaseMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...lease, id: "marker-after-expiry" });
    getActiveStaticGallerySyncLeaseMock.mockResolvedValue(null);
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const first = await POST(request());
    const second = await POST(request());

    expect(first.status).toBe(409);
    expect(second.status).toBe(202);
    expect(acquireStaticGallerySyncLeaseMock).toHaveBeenCalledTimes(2);
  });
});
