import {
  APP_AUDIENCES,
  GRADE_BANDS,
  INTERACTION_TYPES,
  normalizeAppMetadata,
  type AppAudience,
  type AppInteractionType,
  type GradeBand
} from "@/lib/apps/metadata";
import type { PublicAppRecord } from "@/lib/apps/types";

export const AUDIENCE_LABELS: Record<AppAudience | "all", string> = {
  all: "전체 대상",
  student: "학생 수업용",
  teacher: "교사 업무·도구",
  mixed: "학생·교사 함께"
};

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  "1-2": "초등 1~2학년",
  "3-4": "초등 3~4학년",
  "5-6": "초등 5~6학년",
  all: "초등 전 학년",
  teacher: "교사용",
  secondary: "중·고등"
};

export const INTERACTION_LABELS: Record<AppInteractionType, string> = {
  practice: "연습·문제 해결",
  simulation: "시뮬레이션",
  collaboration: "협업·토론",
  creation: "창작·제작",
  management: "기록·관리",
  reference: "자료 탐색",
  utility: "변환·도구"
};

export interface ArchiveFilterOptions {
  subjects: Array<{ value: string; count: number }>;
  gradeBands: Array<{ value: GradeBand; count: number }>;
  interactionTypes: Array<{ value: AppInteractionType; count: number }>;
  audiences: Array<{ value: AppAudience | "all"; count: number }>;
}

function countBy<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

const ELEMENTARY_GRADE_BANDS = new Set<GradeBand>(["1-2", "3-4", "5-6"]);

function matchesGradeBand(gradeBands: GradeBand[], value: GradeBand) {
  return (
    gradeBands.includes(value) ||
    (ELEMENTARY_GRADE_BANDS.has(value) && gradeBands.includes("all"))
  );
}

export function getArchiveFilterOptions(
  apps: PublicAppRecord[]
): ArchiveFilterOptions {
  const metadata = apps.map((app) => normalizeAppMetadata(app));
  const subjectCounts = countBy(metadata.flatMap((item) => item.subjects));
  const interactionCounts = countBy(
    metadata.map((item) => item.interactionType)
  );
  const audienceCounts = countBy(metadata.map((item) => item.audience));

  const audienceValues: Array<AppAudience | "all"> = [
    "all",
    ...APP_AUDIENCES
  ];

  return {
    subjects: [...subjectCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "ko"))
      .map(([value, count]) => ({ value, count })),
    gradeBands: GRADE_BANDS.filter((value) =>
      metadata.some((item) => matchesGradeBand(item.gradeBands, value))
    ).map((value) => ({
      value,
      count: metadata.filter((item) => matchesGradeBand(item.gradeBands, value)).length
    })),
    interactionTypes: INTERACTION_TYPES.filter((value) =>
      interactionCounts.has(value)
    ).map((value) => ({ value, count: interactionCounts.get(value) ?? 0 })),
    audiences: audienceValues.map((value) => ({
      value,
      count:
        value === "all"
          ? apps.length
          : audienceCounts.get(value as AppAudience) ?? 0
    }))
  };
}
