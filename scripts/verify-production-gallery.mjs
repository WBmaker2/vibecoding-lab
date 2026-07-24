import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = process.cwd();
const SNAPSHOT_PATH = path.join(REPO_ROOT, "src", "data", "public-apps.json");

export function extractRenderedAppCount(html) {
  const text = String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\\uac1c/g, "개")
    .replace(/\\uc758/g, "의")
    .replace(/\\s+/g, " ");
  const match = text.match(/(\d+)\s*개의\s*앱/u);
  return match ? Number(match[1]) : null;
}

export async function verifyProductionCount({
  baseUrl = "https://www.vibehong.shop",
  expectedCount,
  attempts = 20,
  delayMs = 15000,
  fetchHtml = async () => {
    const response = await fetch(baseUrl, { headers: { "cache-control": "no-cache" } });
    if (!response.ok) throw new Error(`production request failed: ${response.status}`);
    return response.text();
  }
}) {
  let lastCount = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const html = await fetchHtml();
    lastCount = extractRenderedAppCount(html);
    if (lastCount === expectedCount) return { expectedCount, liveCount: lastCount, attempt };
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`production gallery mismatch: expected ${expectedCount} apps but found ${lastCount ?? "unknown"}`);
}

async function main() {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf("--base-url");
  const baseUrl = baseIndex >= 0 ? args[baseIndex + 1] : "https://www.vibehong.shop";
  const snapshot = JSON.parse(await fs.readFile(SNAPSHOT_PATH, "utf8"));
  const result = await verifyProductionCount({ baseUrl, expectedCount: snapshot.appCount });
  console.log(`production-gallery verified expected=${result.expectedCount} live=${result.liveCount} attempt=${result.attempt}`);
}

if (process.argv[1]?.endsWith("verify-production-gallery.mjs")) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
