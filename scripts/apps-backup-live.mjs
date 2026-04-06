import fs from "node:fs/promises";
import path from "node:path";

const baseUrl =
  process.argv[2] ??
  process.env.APP_SNAPSHOT_URL ??
  process.env.APP_BASE_URL ??
  "https://hongs-vibe-coding-lab.vercel.app";
const outputPath =
  process.argv[3] ??
  path.join(
    process.cwd(),
    "tmp",
    "backups",
    `live-apps-${new Date().toISOString().replaceAll(":", "-")}.json`
  );

function extractInitialAppsFromHomeHtml(html) {
  const normalizedHtml = html.replace(/\\"/g, '"');
  const match = normalizedHtml.match(/"initialApps":(\[[\s\S]*?\])}\]/);

  if (!match) {
    throw new Error("initialApps payload could not be found in the home HTML.");
  }

  return JSON.parse(
    match[1].replace(/"\$D([^"]+)"/g, (_, value) => `"${value}"`)
  );
}

const response = await fetch(baseUrl, {
  headers: {
    "user-agent": "codex-backup-script"
  }
});

if (!response.ok) {
  throw new Error(`Failed to fetch ${baseUrl}: ${response.status}`);
}

const html = await response.text();
const apps = extractInitialAppsFromHomeHtml(html);
const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  appCount: apps.length,
  apps
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), "utf8");

console.log(outputPath);
