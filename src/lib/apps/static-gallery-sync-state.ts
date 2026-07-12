import type { AdminAppRecord } from "./types";

export interface StaticGalleryBaseline {
  generatedAt: string;
  appCount: number;
  updatedAtById: Record<string, string>;
}

export interface StaticGallerySyncSummary {
  pendingCount: number;
  dbCount: number;
  snapshotCount: number;
  generatedAt: string;
}

export interface StaticGallerySyncRun {
  id: number;
  status: string | null;
  conclusion: string | null;
  htmlUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const ACTIVE_WORKFLOW_STATUSES = new Set([
  "queued",
  "in_progress",
  "waiting",
  "requested",
  "pending"
]);

export function isActiveStaticGalleryRun(
  run: StaticGallerySyncRun | null
): boolean {
  return Boolean(run?.status && ACTIVE_WORKFLOW_STATUSES.has(run.status));
}

function getTime(value: Date | string): number | null {
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function getStaticGallerySyncSummary(
  adminApps: AdminAppRecord[],
  baseline: StaticGalleryBaseline
): StaticGallerySyncSummary {
  const adminById = new Map(adminApps.map((app) => [app.id, app]));
  const ids = new Set([
    ...adminById.keys(),
    ...Object.keys(baseline.updatedAtById)
  ]);
  let pendingCount = 0;

  for (const id of ids) {
    const adminApp = adminById.get(id);
    const snapshotUpdatedAt = baseline.updatedAtById[id];

    if (!adminApp || typeof snapshotUpdatedAt !== "string") {
      pendingCount += 1;
      continue;
    }

    const adminTime = getTime(adminApp.updatedAt);
    const snapshotTime = getTime(snapshotUpdatedAt);

    if (adminTime === null || snapshotTime === null || adminTime !== snapshotTime) {
      pendingCount += 1;
    }
  }

  return {
    pendingCount,
    dbCount: adminApps.length,
    snapshotCount: baseline.appCount,
    generatedAt: baseline.generatedAt
  };
}
