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
import * as leaseModule from "./static-gallery-sync-lease";

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

  it("creates the table and atomically acquires with a fail-fast advisory lock", async () => {
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ locked: true }])
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
    expect(statements[1]).toContain("select pg_try_advisory_xact_lock");
    expect(statements[1]).toContain("as locked");
    expect(statements[2]).toContain("on conflict (lease_key) do update set");
    expect(statements[2]).toContain(
      "where static_gallery_sync_leases.expires_at <= now()"
    );
  });

  it("returns immediately when the advisory lock is unavailable", async () => {
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ locked: false }]);

    const acquired = await acquireStaticGallerySyncLease();

    expect(acquired).toBeNull();
    expect(executeMock).toHaveBeenCalledTimes(2);
    expect(executedSql()[1]).toContain("pg_try_advisory_xact_lock");
  });

  it("durably prepares the marker before the final dispatch fence", async () => {
    const events: string[] = [];
    const preparedRow = {
      ...row,
      expires_at: "2026-07-10T04:00:00.000Z",
      previous_run_id: 700
    };
    const dispatchedRow = {
      ...preparedRow,
      expires_at: "2026-07-10T04:30:00.000Z"
    };
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([preparedRow])
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([dispatchedRow]);
    let transactionNumber = 0;
    transactionMock.mockImplementation(
      async (
        callback: (transaction: { execute: typeof executeMock }) => Promise<unknown>
      ) => {
        transactionNumber += 1;
        events.push(`transaction:${transactionNumber}:start`);
        const result = await callback({ execute: executeMock });
        events.push(`transaction:${transactionNumber}:end`);
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
      status: "completed",
      lease: {
        leaseToken: "lease-token",
        id: "marker-id",
        requestedAt: row.requested_at,
        leaseExpiresAt: dispatchedRow.expires_at,
        previousRunId: 700,
        runId: null
      },
      result: "accepted"
    });
    expect(events).toEqual([
      "transaction:1:start",
      "transaction:1:end",
      "transaction:2:start",
      "dispatch",
      "transaction:2:end"
    ]);
    expect(statements[1]).toContain("pg_try_advisory_xact_lock");
    expect(statements[2]).toContain("set previous_run_id =");
    expect(statements[2]).toContain("expires_at = now() +");
    expect(statements[2]).toMatch(/and lease_token = \$\d+/);
    expect(statements[3]).toContain("pg_try_advisory_xact_lock");
    expect(statements[4]).toContain("expires_at = now() +");
    expect(statements[4]).toMatch(/and lease_token = \$\d+/);
  });

  it("does not invoke dispatch when the fencing update no longer owns a row", async () => {
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([]);
    const dispatch = vi.fn(async () => "must-not-run");

    const fenced = await withStaticGallerySyncLeaseDispatchFence(
      "stale-token",
      700,
      dispatch
    );

    expect(fenced).toEqual({ status: "ownership_lost" });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not invoke dispatch when the final advisory lock is busy", async () => {
    const preparedRow = {
      ...row,
      expires_at: "2026-07-10T04:00:00.000Z",
      previous_run_id: 700
    };
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([preparedRow])
      .mockResolvedValueOnce([{ locked: false }]);
    const dispatch = vi.fn(async () => "must-not-run");

    const fenced = await withStaticGallerySyncLeaseDispatchFence(
      "lease-token",
      700,
      dispatch
    );

    expect(fenced).toEqual({ status: "lock_unavailable" });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("keeps the prepared marker when accepted dispatch is followed by commit failure", async () => {
    const preparedRow = {
      ...row,
      expires_at: "2026-07-10T04:00:00.000Z",
      previous_run_id: 700
    };
    const dispatchedRow = {
      ...preparedRow,
      expires_at: "2026-07-10T04:30:00.000Z"
    };
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([preparedRow])
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([dispatchedRow]);
    transactionMock
      .mockImplementationOnce(
        async (
          callback: (transaction: { execute: typeof executeMock }) => Promise<unknown>
        ) => callback({ execute: executeMock })
      )
      .mockImplementationOnce(
        async (
          callback: (transaction: { execute: typeof executeMock }) => Promise<unknown>
        ) => {
          await callback({ execute: executeMock });
          throw new Error("commit failed");
        }
      );
    const dispatch = vi.fn(async () => "accepted");

    const fenced = await withStaticGallerySyncLeaseDispatchFence(
      "lease-token",
      700,
      dispatch
    );

    expect(fenced).toEqual({
      status: "dispatch_uncertain",
      phase: "commit",
      lease: {
        leaseToken: "lease-token",
        id: "marker-id",
        requestedAt: row.requested_at,
        leaseExpiresAt: preparedRow.expires_at,
        previousRunId: 700,
        runId: null
      },
      result: "accepted"
    });
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("keeps the prepared marker when dispatch transport throws", async () => {
    const preparedRow = {
      ...row,
      expires_at: "2026-07-10T04:00:00.000Z",
      previous_run_id: 700
    };
    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([preparedRow])
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([preparedRow]);
    const dispatch = vi.fn(async () => {
      throw new Error("network failed");
    });

    const fenced = await withStaticGallerySyncLeaseDispatchFence(
      "lease-token",
      700,
      dispatch
    );

    expect(fenced).toMatchObject({
      status: "dispatch_uncertain",
      phase: "transport",
      lease: {
        leaseToken: "lease-token",
        previousRunId: 700
      }
    });
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

  it("looks up a requested marker only inside the bounded retention window", async () => {
    const lookup = (
      leaseModule as typeof leaseModule & {
        getStaticGallerySyncLeaseByMarker?: (
          markerId: string
        ) => Promise<unknown>;
      }
    ).getStaticGallerySyncLeaseByMarker;

    expect(lookup).toBeTypeOf("function");

    if (!lookup) {
      return;
    }

    executeMock.mockResolvedValueOnce([]).mockResolvedValueOnce([row]);
    const found = await lookup("marker-id");
    const statements = executedSql();

    expect(found).toMatchObject({ id: "marker-id" });
    expect(statements[1]).toContain("where marker_id =");
    expect(statements[1]).toContain("requested_at >= now() -");
  });
});
