import {
  normalizeAppMetadata,
  normalizeSubjectLabel,
  type AppAudience,
  type AppInteractionType,
  type GradeBand
} from "@/lib/apps/metadata";

export interface SearchableApp {
  url?: string;
  githubUrl?: string;
  title: string;
  summary: string;
  tags: string[];
  subject?: string;
  grade?: string;
  memo?: string;
  subjects?: string[];
  gradeBands?: string[];
  audience?: string;
  interactionType?: string;
  learningProcess?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AppFilters {
  subjects?: readonly string[];
  gradeBands?: readonly GradeBand[];
  audience?: AppAudience | "all";
  interactionTypes?: readonly AppInteractionType[];
}

export type AppSort = "relevance" | "updated" | "title" | "created";

const ELEMENTARY_GRADE_BANDS = new Set<GradeBand>(["1-2", "3-4", "5-6"]);

function normalizeSearchText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("ko") : "";
}

function getSearchHaystack(app: SearchableApp): string {
  return [
    app.url ?? "",
    app.githubUrl ?? "",
    app.title,
    app.summary,
    ...app.tags,
    app.subject ?? "",
    app.grade ?? "",
    app.memo ?? "",
    ...(app.subjects ?? []),
    ...(app.gradeBands ?? []),
    app.audience ?? "",
    app.interactionType ?? "",
    ...(app.learningProcess ?? [])
  ]
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(" ");
}

function getQueryTokens(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/u).filter(Boolean);
}

function includesAny(values: readonly string[], selected: readonly string[]) {
  if (selected.length === 0) return true;
  const normalizedValues = values.map(normalizeSearchText);
  return selected.some((value) => normalizedValues.includes(normalizeSearchText(value)));
}

function matchesStructuredFilters(
  app: SearchableApp,
  filters: AppFilters | undefined
): boolean {
  if (!filters) return true;

  const metadata = normalizeAppMetadata(app);
  const subjects = metadata.subjects.length > 0
    ? metadata.subjects
    : app.subject
      ? [normalizeSubjectLabel(app.subject)]
      : [];

  if (!includesAny(subjects, filters.subjects ?? [])) return false;

  const selectedGrades = filters.gradeBands ?? [];
  if (
    selectedGrades.length > 0 &&
    !selectedGrades.some(
      (grade) =>
        metadata.gradeBands.includes(grade) ||
        (ELEMENTARY_GRADE_BANDS.has(grade) &&
          metadata.gradeBands.includes("all"))
    )
  ) {
    return false;
  }

  if (
    filters.audience &&
    filters.audience !== "all" &&
    metadata.audience !== filters.audience
  ) {
    return false;
  }

  if (!includesAny([metadata.interactionType], filters.interactionTypes ?? [])) {
    return false;
  }

  return true;
}

export function getSearchScore(app: SearchableApp, query: string): number {
  const tokens = getQueryTokens(query);
  if (tokens.length === 0) return 0;

  const title = normalizeSearchText(app.title);
  const summary = normalizeSearchText(app.summary);
  const haystack = getSearchHaystack(app);
  let score = 0;

  if (title === tokens.join(" ")) score += 1000;
  if (title.startsWith(tokens.join(" "))) score += 400;

  for (const token of tokens) {
    if (title.includes(token)) score += 120;
    else if (summary.includes(token)) score += 50;
    else if (haystack.includes(token)) score += 10;
  }

  return score;
}

export function filterApps<T extends SearchableApp>(
  apps: T[],
  query: string,
  activeTags: string[],
  filters?: AppFilters
) {
  const tokens = getQueryTokens(query);

  return apps.filter((app) => {
    const haystack = getSearchHaystack(app);
    const queryMatch = tokens.every((token) => haystack.includes(token));
    const tagMatch = activeTags.every((tag) => app.tags.includes(tag));

    return queryMatch && tagMatch && matchesStructuredFilters(app, filters);
  });
}

function toTimestamp(value: Date | string | undefined): number {
  if (!value) return 0;
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortApps<T extends SearchableApp>(
  apps: T[],
  sort: AppSort,
  query = ""
): T[] {
  const sorted = [...apps];

  sorted.sort((left, right) => {
    if (sort === "relevance") {
      const scoreDifference = getSearchScore(right, query) - getSearchScore(left, query);
      if (scoreDifference !== 0) return scoreDifference;
    }

    if (sort === "updated") {
      const difference = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
      if (difference !== 0) return difference;
    }

    if (sort === "created") {
      const difference = toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
      if (difference !== 0) return difference;
    }

    return left.title.localeCompare(right.title, "ko");
  });

  return sorted;
}
