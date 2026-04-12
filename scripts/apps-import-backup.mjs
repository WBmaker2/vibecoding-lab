import fs from "node:fs/promises";
import postgres from "postgres";

const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("POSTGRES_URL is not configured.");
}

const backupPath = process.argv[2];

if (!backupPath) {
  throw new Error("Usage: node scripts/apps-import-backup.mjs <backup.json>");
}

const raw = await fs.readFile(backupPath, "utf8");
const payload = JSON.parse(raw);

if (!Array.isArray(payload.apps)) {
  throw new Error("Backup JSON must contain an apps array.");
}

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

  for (const app of payload.apps) {
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

  console.log(`Imported ${payload.apps.length} apps from ${backupPath}`);
} finally {
  await client.end({ timeout: 5 });
}
