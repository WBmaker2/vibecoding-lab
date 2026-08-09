import { getStaticGalleryAssetIntegrity } from "@/lib/apps/static-gallery-asset-integrity";
import {
  getStaticGalleryBaseline,
  listStaticPublicApps
} from "@/lib/apps/static-public-apps";
import type {
  StaticGalleryAssetIntegrity,
  StaticGalleryBaseline
} from "@/lib/apps/static-gallery-sync-state";
import { getAppRepository } from "./repository";
import type { AdminAppRecord, PublicAppRecord } from "./types";

export type AdminDataSource =
  | { kind: "database" }
  | {
      kind: "static-fallback";
      reason: string;
    };

export interface AdminPageData {
  apps: AdminAppRecord[];
  assetIntegrity: StaticGalleryAssetIntegrity;
  baseline: StaticGalleryBaseline;
  dataSource: AdminDataSource;
}

function errorToText(error: unknown): string {
  if (error instanceof Error) {
    const cause = "cause" in error ? error.cause : undefined;
    return [error.message, cause ? errorToText(cause) : ""]
      .filter(Boolean)
      .join(" ");
  }

  return String(error ?? "");
}

export function getAdminDatabaseFallbackReason(error: unknown) {
  const errorText = errorToText(error);

  if (/data transfer quota|exceeded.*quota|quota.*exceeded/i.test(errorText)) {
    return "연결된 Postgres DB의 데이터 전송량 한도를 초과해 앱 목록을 읽지 못했습니다.";
  }

  return "관리자 DB를 읽지 못해 공개 정적 스냅샷으로 대신 표시합니다.";
}

export function toStaticAdminFallbackApps(
  apps: PublicAppRecord[]
): AdminAppRecord[] {
  return apps.map((app) => ({
    ...app,
    githubUrl: undefined
  }));
}

export async function loadAdminPageData(): Promise<AdminPageData> {
  const baseline = getStaticGalleryBaseline();
  const assetIntegrity = await getStaticGalleryAssetIntegrity(baseline);

  try {
    const repo = getAppRepository();
    const apps = await repo.listAdminApps();

    return {
      apps,
      assetIntegrity,
      baseline,
      dataSource: { kind: "database" }
    };
  } catch (error) {
    return {
      apps: toStaticAdminFallbackApps(listStaticPublicApps()),
      assetIntegrity,
      baseline,
      dataSource: {
        kind: "static-fallback",
        reason: getAdminDatabaseFallbackReason(error)
      }
    };
  }
}
