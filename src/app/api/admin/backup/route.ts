import { NextResponse } from "next/server";
import {
  createAppsBackupPayload,
  getAppsBackupFilename
} from "@/lib/apps/backup";
import { getAppRepository } from "@/lib/apps/repository";
import { hasAdminSession } from "@/lib/auth/session";

export async function GET() {
  if (!(await hasAdminSession())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const generatedAt = new Date();
  const repo = getAppRepository();
  const appRecords = await repo.listAdminApps();
  const payload = createAppsBackupPayload(appRecords, generatedAt);

  return NextResponse.json(payload, {
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="${getAppsBackupFilename(
        generatedAt
      )}"`
    }
  });
}
