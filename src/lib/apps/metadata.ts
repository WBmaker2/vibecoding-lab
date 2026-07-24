export const GRADE_BANDS = [
  "1-2",
  "3-4",
  "5-6",
  "all",
  "teacher",
  "secondary"
] as const;

export const APP_AUDIENCES = ["student", "teacher", "mixed"] as const;

export const INTERACTION_TYPES = [
  "simulation",
  "practice",
  "collaboration",
  "creation",
  "management",
  "reference",
  "utility"
] as const;

export type GradeBand = (typeof GRADE_BANDS)[number];
export type AppAudience = (typeof APP_AUDIENCES)[number];
export type AppInteractionType = (typeof INTERACTION_TYPES)[number];

export interface AppMetadataSource {
  title?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  subject?: string | null;
  grade?: string | null;
  subjects?: string[] | null;
  gradeBands?: string[] | null;
  audience?: string | null;
  interactionType?: string | null;
  learningProcess?: string[] | null;
}

export interface NormalizedAppMetadata {
  subjects: string[];
  gradeBands: GradeBand[];
  audience: AppAudience;
  interactionType: AppInteractionType;
  learningProcess: string[];
}

function uniqueText(values: readonly unknown[] | null | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values ?? []) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
  }

  return normalized;
}

export function normalizeSubjects(
  subjects: readonly unknown[] | null | undefined,
  legacySubject?: string | null
): string[] {
  const explicit = uniqueText(subjects);
  if (explicit.length > 0) return explicit;

  if (!legacySubject?.trim()) return [];

  return uniqueText(
    legacySubject
      .split(/[\/·・,|]+/)
      .map((part) => part.replace(/\s+융합$/u, "").trim())
      .filter((part) => part !== "융합")
  );
}

function addGradeBand(target: GradeBand[], band: GradeBand) {
  if (!target.includes(band)) target.push(band);
}

export function normalizeGradeBands(
  gradeBands: readonly unknown[] | null | undefined,
  legacyGrade?: string | null
): GradeBand[] {
  const explicit = uniqueText(gradeBands).filter((value): value is GradeBand =>
    (GRADE_BANDS as readonly string[]).includes(value)
  );
  if (explicit.length > 0) return explicit;

  const raw = legacyGrade?.trim();
  if (!raw) return [];

  const compact = raw
    .replaceAll(" ", "")
    .replace(/[～~–—]/g, "-")
    .replace(/학년군/g, "학년")
    .toLowerCase();
  const result: GradeBand[] = [];

  if (/교사용|교사/.test(compact)) addGradeBand(result, "teacher");
  if (/중등|고등|중학교|고등학교/.test(compact)) {
    addGradeBand(result, "secondary");
  }

  if (
    /전학년|1-6학년|1~6학년/.test(raw.replaceAll(" ", "")) ||
    compact === "초등" ||
    compact === "초등학생" ||
    compact === "초등학교"
  ) {
    addGradeBand(result, "all");
  }

  const ranges = [...compact.matchAll(/([1-6])\s*-\s*([1-6])/g)];
  for (const match of ranges) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start <= 2 && end >= 1) addGradeBand(result, "1-2");
    if (start <= 4 && end >= 3) addGradeBand(result, "3-4");
    if (start <= 6 && end >= 5) addGradeBand(result, "5-6");
  }

  if (ranges.length === 0) {
    const grades = [...compact.matchAll(/([1-6])(?:학년)?/g)].map((match) =>
      Number(match[1])
    );
    for (const grade of grades) {
      if (grade <= 2) addGradeBand(result, "1-2");
      else if (grade <= 4) addGradeBand(result, "3-4");
      else addGradeBand(result, "5-6");
    }
  }

  if (compact.includes("초등") && result.length === 0) {
    addGradeBand(result, "all");
  }

  return result;
}

function buildSearchText(source: AppMetadataSource): string {
  return [
    source.title,
    source.summary,
    source.subject,
    source.grade,
    ...(source.tags ?? []),
    ...(source.subjects ?? []),
    ...(source.learningProcess ?? [])
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function normalizeAudience(
  value: string | null | undefined,
  source: AppMetadataSource,
  gradeBands: GradeBand[]
): AppAudience {
  if ((APP_AUDIENCES as readonly string[]).includes(value ?? "")) {
    return value as AppAudience;
  }

  const text = buildSearchText(source);
  const teacher =
    gradeBands.includes("teacher") || /교사|담임|업무|관리자|행정/.test(text);
  const student = /학생|학습자|초등|어린이/.test(text);

  if (teacher && student) return "mixed";
  if (teacher) return "teacher";
  return "student";
}

function normalizeInteractionType(
  value: string | null | undefined,
  source: AppMetadataSource
): AppInteractionType {
  if ((INTERACTION_TYPES as readonly string[]).includes(value ?? "")) {
    return value as AppInteractionType;
  }

  const text = buildSearchText(source);

  if (/담임|업무|행정|관리|기록 시스템|체크리스트/.test(text)) {
    return "management";
  }
  if (/시뮬레이션|시뮬레이터|비교실험|변인통제|실험실|탐사선/.test(text)) {
    return "simulation";
  }
  if (/실시간|협동|협업|토론|공유|의회/.test(text)) {
    return "collaboration";
  }
  if (/제작|만들기|작곡|녹음|그리기|미술|스튜디오|편집/.test(text)) {
    return "creation";
  }
  if (/사전|연표|지도|탐색|도감|자료실/.test(text)) {
    return "reference";
  }
  if (/변환|converter|pdf|jpg|png|heic|다운로드/.test(text)) {
    return "utility";
  }
  return "practice";
}

const DEFAULT_PROCESSES: Record<AppInteractionType, string[]> = {
  management: ["기록", "정리", "확인"],
  simulation: ["예측", "조작", "비교", "설명"],
  practice: ["문제 해결", "피드백", "반복"],
  collaboration: ["의견 제시", "비교", "협의"],
  creation: ["구상", "제작", "공유"],
  reference: ["검색", "탐색", "확인"],
  utility: ["변환", "확인", "저장"]
};

export function normalizeAppMetadata(
  source: AppMetadataSource
): NormalizedAppMetadata {
  const subjects = normalizeSubjects(source.subjects, source.subject);
  const gradeBands = normalizeGradeBands(source.gradeBands, source.grade);
  const audience = normalizeAudience(source.audience, source, gradeBands);
  const interactionType = normalizeInteractionType(source.interactionType, source);
  const learningProcess = uniqueText(source.learningProcess);

  return {
    subjects,
    gradeBands,
    audience,
    interactionType,
    learningProcess:
      learningProcess.length > 0
        ? learningProcess
        : [...DEFAULT_PROCESSES[interactionType]]
  };
}

export function subjectsToLegacyText(subjects: readonly string[]): string | undefined {
  return subjects.length > 0 ? subjects.join(" · ") : undefined;
}

export function gradeBandsToLegacyText(
  gradeBands: readonly GradeBand[]
): string | undefined {
  if (gradeBands.includes("teacher")) return "교사용";
  if (gradeBands.includes("all")) return "초등 전학년";

  const labels = gradeBands
    .filter((band) => band !== "secondary")
    .map((band) => `${band.replace("-", "~")}학년`);
  if (gradeBands.includes("secondary")) labels.push("중·고등");
  return labels.length > 0 ? labels.join(", ") : undefined;
}
