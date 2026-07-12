import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { StaticGalleryDispatchMarker } from "./static-gallery-sync-state";

const LEASE_KEY = "static-gallery-sync";
export const STATIC_GALLERY_SYNC_LEASE_SECONDS = 30 * 60;

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

async function ensureLeaseTable() {
  await getDb().execute(sql`
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
  await ensureLeaseTable();

  const leaseToken = randomUUID();
  const markerId = randomUUID();
  const result = await getDb().execute(sql`
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
}

export async function getActiveStaticGallerySyncLease(): Promise<StaticGallerySyncLease | null> {
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

export async function setStaticGallerySyncPreviousRun(
  leaseToken: string,
  previousRunId: number | null
): Promise<void> {
  await getDb().execute(sql`
    UPDATE static_gallery_sync_leases
    SET previous_run_id = ${previousRunId}
    WHERE lease_key = ${LEASE_KEY}
      AND lease_token = ${leaseToken}
      AND expires_at > NOW()
  `);
}

export async function setStaticGallerySyncRun(
  leaseToken: string,
  runId: number
): Promise<StaticGallerySyncLease | null> {
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
  await getDb().execute(sql`
    DELETE FROM static_gallery_sync_leases
    WHERE lease_key = ${LEASE_KEY}
      AND lease_token = ${leaseToken}
  `);
}
