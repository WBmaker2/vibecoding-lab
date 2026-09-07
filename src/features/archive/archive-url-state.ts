import type {
  AppAudience,
  AppInteractionType,
  GradeBand
} from "@/lib/apps/metadata";
import type { AppSort } from "@/lib/search/filter-apps";
import type { ArchiveFilterOptions } from "./archive-filter-options";

export interface ArchiveUrlState {
  activeTags: string[];
  audience: AppAudience | "all";
  gradeBands: GradeBand[];
  interactionTypes: AppInteractionType[];
  page: number;
  query: string;
  recentOnly: boolean;
  savedOnly: boolean;
  selectedSubjects: string[];
  sort: AppSort;
}

function readList(params: URLSearchParams, key: string) {
  return [
    ...new Set(
      params
        .getAll(key)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ];
}

export function readArchiveUrlState(
  search: string,
  options: ArchiveFilterOptions
): ArchiveUrlState {
  const params = new URLSearchParams(search);
  const validSubjects = new Set(options.subjects.map((option) => option.value));
  const validGrades = new Set(options.gradeBands.map((option) => option.value));
  const validInteractions = new Set(
    options.interactionTypes.map((option) => option.value)
  );
  const activeTags = readList(params, "tag");
  const sortValue = params.get("sort") as AppSort | null;

  return {
    activeTags,
    audience:
      (params.get("audience") as AppAudience | "all" | null) &&
      ["all", "student", "teacher", "mixed"].includes(
        params.get("audience") ?? ""
      )
        ? (params.get("audience") as AppAudience | "all")
        : "all",
    gradeBands: readList(params, "grade").filter((value): value is GradeBand =>
      validGrades.has(value as GradeBand)
    ),
    interactionTypes: readList(params, "interaction").filter(
      (value): value is AppInteractionType =>
        validInteractions.has(value as AppInteractionType)
    ),
    page: Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1),
    query: params.get("q") ?? "",
    recentOnly: params.get("recent") === "1",
    savedOnly: params.get("saved") === "1",
    selectedSubjects: readList(params, "subject").filter((value) =>
      validSubjects.has(value)
    ),
    sort:
      sortValue &&
      ["relevance", "updated", "title", "created"].includes(sortValue)
        ? sortValue
        : "relevance"
  };
}

export function writeArchiveUrlState(state: ArchiveUrlState) {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  state.activeTags.forEach((tag) => params.append("tag", tag));
  state.selectedSubjects.forEach((subject) => params.append("subject", subject));
  state.gradeBands.forEach((grade) => params.append("grade", grade));
  state.interactionTypes.forEach((type) => params.append("interaction", type));
  if (state.audience !== "all") params.set("audience", state.audience);
  if (state.recentOnly) params.set("recent", "1");
  if (state.savedOnly) params.set("saved", "1");
  if (state.sort !== "relevance") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function toggleValue<T>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
