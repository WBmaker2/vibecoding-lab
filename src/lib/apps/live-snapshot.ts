import type { SerializedAppRecord } from "./backup";

const INITIAL_APPS_PATTERN = /"initialApps":(\[[\s\S]*?\])}\]/;

export function extractInitialAppsFromHomeHtml(html: string): SerializedAppRecord[] {
  const normalizedHtml = html.replace(/\\"/g, '"');
  const match = normalizedHtml.match(INITIAL_APPS_PATTERN);

  if (!match) {
    throw new Error("initialApps payload could not be found in the home HTML.");
  }

  const normalizedJson = match[1].replace(
    /"\$D([^"]+)"/g,
    (_, value: string) => `"${value}"`
  );

  return JSON.parse(normalizedJson) as SerializedAppRecord[];
}
