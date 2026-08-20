import type { PublicAppRecord } from "./types";

function normalizeLabel(value: string) {
  return value.trim().replace(/^#+/, "").toLocaleLowerCase("ko");
}

function uniqueLabels(values: readonly (string | undefined)[]) {
  return new Set(values.filter((value): value is string => Boolean(value)).map(normalizeLabel));
}

function overlapCount(left: Set<string>, right: Set<string>) {
  let count = 0;

  for (const value of left) {
    if (right.has(value)) count += 1;
  }

  return count;
}

function getSimilarityScore(current: PublicAppRecord, candidate: PublicAppRecord) {
  const currentTags = uniqueLabels(current.tags);
  const candidateTags = uniqueLabels(candidate.tags);
  const currentSubjects = uniqueLabels([...(current.subjects ?? []), current.subject]);
  const candidateSubjects = uniqueLabels([
    ...(candidate.subjects ?? []),
    candidate.subject
  ]);

  return (
    overlapCount(currentTags, candidateTags) * 4 +
    overlapCount(currentSubjects, candidateSubjects) * 2
  );
}

export function getRelatedApps(
  current: PublicAppRecord,
  apps: readonly PublicAppRecord[],
  limit = 3
): PublicAppRecord[] {
  return apps
    .filter((candidate) => candidate.id !== current.id)
    .map((candidate) => ({
      candidate,
      score: getSimilarityScore(current, candidate)
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.candidate.updatedAt.getTime() - left.candidate.updatedAt.getTime() ||
        left.candidate.title.localeCompare(right.candidate.title, "ko")
    )
    .slice(0, Math.max(0, limit))
    .map(({ candidate }) => candidate);
}
