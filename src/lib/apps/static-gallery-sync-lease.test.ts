import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock, getDbMock, transactionMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
  getDbMock: vi.fn(),
  transactionMock: vi.fn()
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
  toPublicStaticGalleryDispatchMarker,
  withStaticGallerySyncLeaseDispatchFence
} from "./static-gallery-sync-lease";

const dialect = new PgDialect();
const row = {
  lease_token: "lease-token",
  marker_id: "marker-id",
  requested_at: "2026-07-10T03:00:00.000Z",
  expires_at: "2026-07-10T03:30:00.000Z",
  previous_run_id: null,
  run_id: null
};

function compactSql(query: unknown): string {
  return dialect
    .sqlToQuery(query as SQL)
    .sql.replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function executedSql(): string[] {
  return executeMock.mock.calls.map(([query]) => compactSql(query));
}

describe("static gallery sync lease", () => {
  beforeEach(() => {
    executeMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockImplementation(
      async (
        callback: (transaction: { execute: typeof executeMock }) => Promise<unknown>
      ) => callback({ execute: executeMock })
    );
    getDbMock.mockReturnValue({
      execute: executeMock,
      transaction: transactionMock
    });
  });

  it("creates the table and atomically acquires only an absent or expired lease", async () => {
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([row]);

    const acquired = await acquireStaticGallerySyncLease();
    const statements = executedSql();

    expect(acquired).toMatchObject({
      leaseToken: "lease-token",
      id: "marker-id",
      runId: null
    });
    expect(STATIC_GALLERY_SYNC_LEASE_SECONDS).toBeGreaterThan(0);
    expect(statements[0]).toContain(
      "create table if not exists static_gallery_sync_leases"
    );
    expect(statements[1]).toContain("select pg_advisory_xact_lock");
    expect(statements[2]).toContain("on conflict (lease_key) do update set");
    expect(statements[2]).toContain(
      "where static_gallery_sync_leases.expires_at <= now()"
    );
    expect(transactionMock).toHaveBeenCalledOnce();
  });

  it("fences and renews the current token while dispatch remains inside the transaction", async () => {
    const events: string[] = [];
    const renewedRow = {
      ...row,
      expires_at: "2026-07-10T04:00:00.000Z",
      previous_run_id: 700
    };
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([renewedRow]);
    transactionMock.mockImplementation(
      async (
        callback: (transaction: { execute: typeof executeMock }) => Promise<unknown>
      ) => {
        events.push("transaction:start");
        const result = await callback({ execute: executeMock });
        events.push("transaction:end");
        return result;
      }
    );
    const dispatch = vi.fn(async () => {
      events.push("dispatch");
      return "accepted";
    });

    const fenced = await withStaticGallerySyncLeaseDispatchFence(
      "lease-token",
      700,
      dispatch
    );
    const statements = executedSql();

    expect(fenced).toEqual({
      lease: {
        leaseToken: "lease-token",
        id: "marker-id",
        requestedAt: row.requested_at,
        leaseExpiresAt: renewedRow.expires_at,
        previousRunId: 700,
        runId: null
      },
      result: "accepted"
    });
    expect(events).toEqual(["transaction:start", "dispatch", "transaction:end"]);
    expect(statements[1]).toContain("select pg_advisory_xact_lock");
    expect(statements[2]).toContain("set previous_run_id =");
    expect(statements[2]).toContain("expires_at = now() +");
    expect(statements[2]).toMatch(/and lease_token = \$\d+/);
    expect(statements[2]).toContain("and expires_at > now()");
    expect(statements[2]).toContain("returning lease_token");
  });

  it("does not invoke dispatch when the fencing update no longer owns a row", async () => {
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const dispatch = vi.fn(async () => "must-not-run");

    const fenced = await withStaticGallerySyncLeaseDispatchFence(
      "stale-token",
      700,
      dispatch
    );

    expect(fenced).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("updates a discovered run and releases only the matching lease token", async () => {
    executeMock
      .mockResolvedValueOnce([{ ...row, run_id: 701 }])
      .mockResolvedValueOnce([]);

    const updated = await setStaticGallerySyncRun("lease-token", 701);
    await releaseStaticGallerySyncLease("lease-token");
    const statements = executedSql();

    expect(updated).toMatchObject({ leaseToken: "lease-token", runId: 701 });
    expect(toPublicStaticGalleryDispatchMarker(updated!)).toEqual({
      id: "marker-id",
      requestedAt: row.requested_at,
      leaseExpiresAt: row.expires_at,
      runId: 701
    });
    expect(statements[0]).toMatch(/and lease_token = \$\d+/);
    expect(statements[1]).toContain("delete from static_gallery_sync_leases");
    expect(statements[1]).toMatch(/and lease_token = \$\d+/);
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
