import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { hasTursoDatabase } from "@/lib/env";
import type { StaticGalleryDispatchMarker } from "./static-gallery-sync-state";
import * as tursoLease from "./turso-static-gallery-sync-lease";

const LEASE_KEY = "static-gallery-sync";
export const STATIC_GALLERY_SYNC_LEASE_SECONDS = 30 * 60;
export const STATIC_GALLERY_SYNC_MARKER_RETENTION_SECONDS = 24 * 60 * 60;

export interface StaticGallerySyncLease extends StaticGalleryDispatchMarker {
  leaseToken: string;
  previousRunId: number | null;
}

interface LeaseRow {
  lease_token: string;
  marker_id: string;
  requested_at: Date | string;
  expires_at: Date | string;
  previous_run_id: number | bigint | null;
  run_id: number | bigint | null;
}

interface AdvisoryLockRow {
  locked: boolean;
}

export type StaticGallerySyncDispatchFenceResult<T> =
  | {
      status: "completed";
      lease: StaticGallerySyncLease;
      result: T;
    }
  | {
      status: "dispatch_uncertain";
      phase: "commit";
      lease: StaticGallerySyncLease;
      result: T;
    }
  | {
      status: "dispatch_uncertain";
      phase: "transport";
      lease: StaticGallerySyncLease;
    }
  | { status: "lock_unavailable" }
  | { status: "ownership_lost" };

async function ensureLeaseTable(db = getDb()) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS static_gallery_sync_leases (
      lease_key text PRIMARY KEY,
      lease_token text NOT NULL,
      marker_id uuid NOT NULL,
      requested_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL,
      previous_run_id bigint,
      run_id bigint
    )
  `);
}

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Static gallery sync lease contains an invalid date.");
  }

  return date.toISOString();
}

function toRunId(value: number | bigint | null): number | null {
  if (value === null) {
    return null;
  }

  const numberValue = typeof value === "bigint" ? Number(value) : value;

  return Number.isSafeInteger(numberValue) ? numberValue : null;
}

function fromRow(row: LeaseRow): StaticGallerySyncLease {
  return {
    leaseToken: row.lease_token,
    id: row.marker_id,
    requestedAt: toIso(row.requested_at),
    leaseExpiresAt: toIso(row.expires_at),
    previousRunId: toRunId(row.previous_run_id),
    runId: toRunId(row.run_id)
  };
}

export function toPublicStaticGalleryDispatchMarker(
  lease: StaticGallerySyncLease
): StaticGalleryDispatchMarker {
  return {
    id: lease.id,
    requestedAt: lease.requestedAt,
    leaseExpiresAt: lease.leaseExpiresAt,
    runId: lease.runId
  };
}

export async function acquireStaticGallerySyncLease(): Promise<StaticGallerySyncLease | null> {
  if (hasTursoDatabase()) {
    return tursoLease.acquireStaticGallerySyncLease();
  }

  const db = getDb();
  await ensureLeaseTable(db);
  const leaseToken = randomUUID();
  const markerId = randomUUID();

  return db.transaction(async (transaction) => {
    const lockResult = await transaction.execute(sql`
      SELECT pg_try_advisory_xact_lock(hashtext(${LEASE_KEY})::bigint) AS locked
    `);
    const lockRow = (lockResult as unknown as AdvisoryLockRow[])[0];

    if (lockRow?.locked !== true) {
      return null;
    }

    const result = await transaction.execute(sql`
      INSERT INTO static_gallery_sync_leases (
        lease_key,
        lease_token,
        marker_id,
        requested_at,
        expires_at,
        previous_run_id,
        run_id
      )
      VALUES (
        ${LEASE_KEY},
        ${leaseToken},
        ${markerId},
        NOW(),
        NOW() + (${STATIC_GALLERY_SYNC_LEASE_SECONDS} * INTERVAL '1 second'),
        NULL,
        NULL
      )
      ON CONFLICT (lease_key) DO UPDATE SET
        lease_token = EXCLUDED.lease_token,
        marker_id = EXCLUDED.marker_id,
        requested_at = EXCLUDED.requested_at,
        expires_at = EXCLUDED.expires_at,
        previous_run_id = NULL,
        run_id = NULL
      WHERE static_gallery_sync_leases.expires_at <= NOW()
      RETURNING lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
    `);
    const row = (result as unknown as LeaseRow[])[0];

    return row ? fromRow(row) : null;
  });
}

export async function getActiveStaticGallerySyncLease(): Promise<StaticGallerySyncLease | null> {
  if (hasTursoDatabase()) {
    return tursoLease.getActiveStaticGallerySyncLease();
  }

  await ensureLeaseTable();

  const result = await getDb().execute(sql`
    SELECT lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
    FROM static_gallery_sync_leases
    WHERE lease_key = ${LEASE_KEY}
      AND expires_at > NOW()
    LIMIT 1
  `);
  const row = (result as unknown as LeaseRow[])[0];

  return row ? fromRow(row) : null;
}

export async function getStaticGallerySyncLeaseByMarker(
  markerId: string
): Promise<StaticGallerySyncLease | null> {
  if (hasTursoDatabase()) {
    return tursoLease.getStaticGallerySyncLeaseByMarker(markerId);
  }

  await ensureLeaseTable();

  const result = await getDb().execute(sql`
    SELECT lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
    FROM static_gallery_sync_leases
    WHERE marker_id = ${markerId}
      AND requested_at >= NOW() - (${STATIC_GALLERY_SYNC_MARKER_RETENTION_SECONDS} * INTERVAL '1 second')
    LIMIT 1
  `);
  const row = (result as unknown as LeaseRow[])[0];

  return row ? fromRow(row) : null;
}

export async function withStaticGallerySyncLeaseDispatchFence<T>(
  leaseToken: string,
  previousRunId: number | null,
  dispatch: (lease: StaticGallerySyncLease) => Promise<T>
): Promise<StaticGallerySyncDispatchFenceResult<T>> {
  if (hasTursoDatabase()) {
    return tursoLease.withStaticGallerySyncLeaseDispatchFence(
      leaseToken,
      previousRunId,
      dispatch
    );
  }

  const db = getDb();
  await ensureLeaseTable(db);

  const prepared = await db.transaction(async (transaction) => {
    const lockResult = await transaction.execute(sql`
      SELECT pg_try_advisory_xact_lock(hashtext(${LEASE_KEY})::bigint) AS locked
    `);
    const lockRow = (lockResult as unknown as AdvisoryLockRow[])[0];

    if (lockRow?.locked !== true) {
      return { status: "lock_unavailable" } as const;
    }

    const result = await transaction.execute(sql`
      UPDATE static_gallery_sync_leases
      SET
        previous_run_id = ${previousRunId},
        expires_at = NOW() + (${STATIC_GALLERY_SYNC_LEASE_SECONDS} * INTERVAL '1 second')
      WHERE lease_key = ${LEASE_KEY}
        AND lease_token = ${leaseToken}
        AND expires_at > NOW()
      RETURNING lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
    `);
    const row = (result as unknown as LeaseRow[])[0];

    if (!row) {
      return { status: "ownership_lost" } as const;
    }

    return {
      status: "prepared",
      lease: fromRow(row)
    } as const;
  });

  if (prepared.status !== "prepared") {
    return prepared;
  }

  let dispatchStarted = false;
  let dispatchCompleted = false;
  let dispatchResult: T | undefined;

  try {
    return await db.transaction(async (transaction) => {
      const lockResult = await transaction.execute(sql`
        SELECT pg_try_advisory_xact_lock(hashtext(${LEASE_KEY})::bigint) AS locked
      `);
      const lockRow = (lockResult as unknown as AdvisoryLockRow[])[0];

      if (lockRow?.locked !== true) {
        return { status: "lock_unavailable" } as const;
      }

      const result = await transaction.execute(sql`
        UPDATE static_gallery_sync_leases
        SET
          previous_run_id = ${previousRunId},
          expires_at = NOW() + (${STATIC_GALLERY_SYNC_LEASE_SECONDS} * INTERVAL '1 second')
        WHERE lease_key = ${LEASE_KEY}
          AND lease_token = ${leaseToken}
          AND expires_at > NOW()
        RETURNING lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
      `);
      const row = (result as unknown as LeaseRow[])[0];

      if (!row) {
        return { status: "ownership_lost" } as const;
      }

      const lease = fromRow(row);
      dispatchStarted = true;
      dispatchResult = await dispatch(lease);
      dispatchCompleted = true;

      return {
        status: "completed",
        lease,
        result: dispatchResult
      } as const;
    });
  } catch (error) {
    if (!dispatchStarted) {
      throw error;
    }

    if (dispatchCompleted) {
      return {
        status: "dispatch_uncertain",
        phase: "commit",
        lease: prepared.lease,
        result: dispatchResult as T
      };
    }

    return {
      status: "dispatch_uncertain",
      phase: "transport",
      lease: prepared.lease
    };
  }
}

export async function setStaticGallerySyncRun(
  leaseToken: string,
  runId: number
): Promise<StaticGallerySyncLease | null> {
  if (hasTursoDatabase()) {
    return tursoLease.setStaticGallerySyncRun(leaseToken, runId);
  }

  const result = await getDb().execute(sql`
    UPDATE static_gallery_sync_leases
    SET run_id = ${runId}
    WHERE lease_key = ${LEASE_KEY}
      AND lease_token = ${leaseToken}
      AND expires_at > NOW()
    RETURNING lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
  `);
  const row = (result as unknown as LeaseRow[])[0];

  return row ? fromRow(row) : null;
}

export async function releaseStaticGallerySyncLease(
  leaseToken: string
): Promise<void> {
  if (hasTursoDatabase()) {
    await tursoLease.releaseStaticGallerySyncLease(leaseToken);
    return;
  }

  await getDb().execute(sql`
    DELETE FROM static_gallery_sync_leases
    WHERE lease_key = ${LEASE_KEY}
      AND lease_token = ${leaseToken}
  `);
}
