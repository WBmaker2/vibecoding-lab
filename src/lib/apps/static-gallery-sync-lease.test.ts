import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock, getDbMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
  getDbMock: vi.fn()
}));

vi.mock("@/db/client", () => ({
  getDb: getDbMock
}));

import {
  acquireStaticGallerySyncLease,
  getActiveStaticGallerySyncLease,
  releaseStaticGallerySyncLease,
  setStaticGallerySyncRun,
  STATIC_GALLERY_SYNC_LEASE_SECONDS,
  toPublicStaticGalleryDispatchMarker
} from "./static-gallery-sync-lease";

const row = {
  lease_token: "lease-token",
  marker_id: "marker-id",
  requested_at: "2026-07-10T03:00:00.000Z",
  expires_at: "2026-07-10T03:30:00.000Z",
  previous_run_id: null,
  run_id: null
};

describe("static gallery sync lease", () => {
  beforeEach(() => {
    executeMock.mockReset();
    getDbMock.mockReturnValue({ execute: executeMock });
  });

  it("uses the database result to reject an unexpired lease and retry after expiry", async () => {
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...row, lease_token: "new-lease-token" }]);

    const first = await acquireStaticGallerySyncLease();
    const blocked = await acquireStaticGallerySyncLease();
    const retried = await acquireStaticGallerySyncLease();

    expect(first).toMatchObject({
      leaseToken: "lease-token",
      id: "marker-id",
      runId: null
    });
    expect(blocked).toBeNull();
    expect(retried).toMatchObject({ leaseToken: "new-lease-token" });
    expect(STATIC_GALLERY_SYNC_LEASE_SECONDS).toBeGreaterThan(0);
  });

  it("updates and releases only the lease token while keeping public fields normalized", async () => {
    executeMock
      .mockResolvedValueOnce([{ ...row, run_id: 701 }])
      .mockResolvedValueOnce([]);

    const updated = await setStaticGallerySyncRun("lease-token", 701);
    await releaseStaticGallerySyncLease("lease-token");

    expect(updated).toMatchObject({ leaseToken: "lease-token", runId: 701 });
    expect(toPublicStaticGalleryDispatchMarker(updated!)).toEqual({
      id: "marker-id",
      requestedAt: row.requested_at,
      leaseExpiresAt: row.expires_at,
      runId: 701
    });
    expect(executeMock).toHaveBeenCalledTimes(2);
  });

  it("returns only an active normalized marker from the lease table", async () => {
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([row]);

    const active = await getActiveStaticGallerySyncLease();

    expect(toPublicStaticGalleryDispatchMarker(active!)).toEqual({
      id: "marker-id",
      requestedAt: row.requested_at,
      leaseExpiresAt: row.expires_at,
      runId: null
    });
  });
});
