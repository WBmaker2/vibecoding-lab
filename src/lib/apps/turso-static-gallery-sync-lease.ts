import { randomUUID } from "node:crypto";
import { getTursoClient } from "@/db/turso-client";
import type {
  StaticGallerySyncDispatchFenceResult,
  StaticGallerySyncLease
} from "./static-gallery-sync-lease";

const LEASE_KEY = "static-gallery-sync";
export const STATIC_GALLERY_SYNC_LEASE_SECONDS = 30 * 60;
export const STATIC_GALLERY_SYNC_MARKER_RETENTION_SECONDS = 24 * 60 * 60;

interface LeaseRow {
  lease_token: unknown;
  marker_id: unknown;
  requested_at: unknown;
  expires_at: unknown;
  previous_run_id: unknown;
  run_id: unknown;
}

async function ensureLeaseTable() {
  await getTursoClient().execute({
    sql: `
      CREATE TABLE IF NOT EXISTS static_gallery_sync_leases (
        lease_key TEXT PRIMARY KEY NOT NULL,
        lease_token TEXT NOT NULL,
        marker_id TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        previous_run_id INTEGER,
        run_id INTEGER
      )
    `,
    args: []
  });
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function toIso(value: unknown) {
  const date = new Date(textValue(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error("Turso static gallery lease contains an invalid date.");
  }
  return date.toISOString();
}

function toRunId(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) ? numberValue : null;
}

function fromRow(row: LeaseRow): StaticGallerySyncLease {
  return {
    leaseToken: textValue(row.lease_token),
    id: textValue(row.marker_id),
    requestedAt: toIso(row.requested_at),
    leaseExpiresAt: toIso(row.expires_at),
    previousRunId: toRunId(row.previous_run_id),
    runId: toRunId(row.run_id)
  };
}

function firstLeaseRow(result: { rows: unknown[] }) {
  return result.rows[0] as LeaseRow | undefined;
}

export async function acquireStaticGallerySyncLease(): Promise<StaticGallerySyncLease | null> {
  await ensureLeaseTable();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + STATIC_GALLERY_SYNC_LEASE_SECONDS * 1000
  );
  const result = await getTursoClient().execute({
    sql: `
      INSERT INTO static_gallery_sync_leases (
        lease_key, lease_token, marker_id, requested_at, expires_at,
        previous_run_id, run_id
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL)
      ON CONFLICT (lease_key) DO UPDATE SET
        lease_token = excluded.lease_token,
        marker_id = excluded.marker_id,
        requested_at = excluded.requested_at,
        expires_at = excluded.expires_at,
        previous_run_id = NULL,
        run_id = NULL
      WHERE static_gallery_sync_leases.expires_at <= excluded.requested_at
      RETURNING lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
    `,
    args: [
      LEASE_KEY,
      randomUUID(),
      randomUUID(),
      now.toISOString(),
      expiresAt.toISOString()
    ]
  });
  const row = firstLeaseRow(result);

  return row ? fromRow(row) : null;
}

export async function getActiveStaticGallerySyncLease(): Promise<StaticGallerySyncLease | null> {
  await ensureLeaseTable();
  const result = await getTursoClient().execute({
    sql: `
      SELECT lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
      FROM static_gallery_sync_leases
      WHERE lease_key = ? AND expires_at > ?
      LIMIT 1
    `,
    args: [LEASE_KEY, new Date().toISOString()]
  });
  const row = firstLeaseRow(result);

  return row ? fromRow(row) : null;
}

export async function getStaticGallerySyncLeaseByMarker(
  markerId: string
): Promise<StaticGallerySyncLease | null> {
  await ensureLeaseTable();
  const cutoff = new Date(
    Date.now() - STATIC_GALLERY_SYNC_MARKER_RETENTION_SECONDS * 1000
  );
  const result = await getTursoClient().execute({
    sql: `
      SELECT lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
      FROM static_gallery_sync_leases
      WHERE marker_id = ? AND requested_at >= ?
      LIMIT 1
    `,
    args: [markerId, cutoff.toISOString()]
  });
  const row = firstLeaseRow(result);

  return row ? fromRow(row) : null;
}

async function renewLease(
  leaseToken: string,
  previousRunId: number | null
): Promise<StaticGallerySyncLease | null> {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + STATIC_GALLERY_SYNC_LEASE_SECONDS * 1000
  );
  const result = await getTursoClient().execute({
    sql: `
      UPDATE static_gallery_sync_leases
      SET previous_run_id = ?, expires_at = ?
      WHERE lease_key = ? AND lease_token = ? AND expires_at > ?
      RETURNING lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
    `,
    args: [
      previousRunId,
      expiresAt.toISOString(),
      LEASE_KEY,
      leaseToken,
      now.toISOString()
    ]
  });
  const row = firstLeaseRow(result);

  return row ? fromRow(row) : null;
}

export async function withStaticGallerySyncLeaseDispatchFence<T>(
  leaseToken: string,
  previousRunId: number | null,
  dispatch: (lease: StaticGallerySyncLease) => Promise<T>
): Promise<StaticGallerySyncDispatchFenceResult<T>> {
  await ensureLeaseTable();
  const lease = await renewLease(leaseToken, previousRunId);

  if (!lease) {
    return { status: "ownership_lost" };
  }

  let dispatchStarted = false;
  let dispatchResult: T | undefined;

  try {
    dispatchStarted = true;
    dispatchResult = await dispatch(lease);
    return { status: "completed", lease, result: dispatchResult };
  } catch (error) {
    if (!dispatchStarted) throw error;

    return {
      status: "dispatch_uncertain",
      phase: "transport",
      lease
    };
  }
}

export async function setStaticGallerySyncRun(
  leaseToken: string,
  runId: number
): Promise<StaticGallerySyncLease | null> {
  const result = await getTursoClient().execute({
    sql: `
      UPDATE static_gallery_sync_leases
      SET run_id = ?
      WHERE lease_key = ? AND lease_token = ? AND expires_at > ?
      RETURNING lease_token, marker_id, requested_at, expires_at, previous_run_id, run_id
    `,
    args: [runId, LEASE_KEY, leaseToken, new Date().toISOString()]
  });
  const row = firstLeaseRow(result);

  return row ? fromRow(row) : null;
}

export async function releaseStaticGallerySyncLease(
  leaseToken: string
): Promise<void> {
  await getTursoClient().execute({
    sql: "DELETE FROM static_gallery_sync_leases WHERE lease_key = ? AND lease_token = ?",
    args: [LEASE_KEY, leaseToken]
  });
}
