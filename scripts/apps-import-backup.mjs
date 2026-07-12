import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { prepareBackupApps } from "./lib/apps-import-backup-preparation.mjs";

export async function runBackupImport({
  backupPath = process.argv[2],
  databaseUrl = process.env.POSTGRES_URL
} = {}) {
  if (!databaseUrl) {
    throw new Error("POSTGRES_URL is not configured.");
  }

  if (!backupPath) {
    throw new Error("Usage: node scripts/apps-import-backup.mjs <backup.json>");
  }

  const raw = await fs.readFile(backupPath, "utf8");
  const apps = prepareBackupApps(JSON.parse(raw));
  const client = postgres(databaseUrl, {
    max: 1,
    prepare: false
  });

  try {
    const [{ count }] = await client`
      select count(*)::int as count
      from apps
    `;

    if (Number(count) > 0) {
      throw new Error(
        "apps table is not empty. Stop here and export a fresh backup before importing."
      );
    }

    for (const app of apps) {
      await client`
        insert into apps (
          id,
          title,
          summary,
          url,
          github_url,
          tags,
          thumbnail_mode,
          thumbnail_url,
          subject,
          grade,
          memo,
          created_at,
          updated_at
        ) values (
          ${app.id},
          ${app.title},
          ${app.summary},
          ${app.url},
          ${app.githubUrl ?? null},
          ${app.tags},
          ${app.thumbnailMode},
          ${app.thumbnailUrl ?? null},
          ${app.subject ?? null},
          ${app.grade ?? null},
          ${app.memo ?? null},
          ${app.createdAt},
          ${app.updatedAt}
        )
      `;
    }

    console.log(`Imported ${apps.length} apps from ${backupPath}`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  runBackupImport().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
