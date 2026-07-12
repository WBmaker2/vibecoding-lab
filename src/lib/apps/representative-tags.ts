import type { PublicAppRecord } from "./types";

function normalizeTag(tag: string) {
  return tag.trim().replace(/^#+/, "").trim();
}

export function getRepresentativeTags(
  apps: PublicAppRecord[],
  limit = 10
): string[] {
  const counts = new Map<string, number>();

  for (const app of apps) {
    const uniqueTags = new Set(
      app.tags.map(normalizeTag).filter((tag) => tag.length > 0)
    );

    for (const tag of uniqueTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort(
      ([leftTag, leftCount], [rightTag, rightCount]) =>
        rightCount - leftCount || leftTag.localeCompare(rightTag, "ko")
    )
    .slice(0, Math.max(0, limit))
    .map(([tag]) => tag);
}
