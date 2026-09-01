import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_SNAPSHOT_PATH = path.join(
  REPO_ROOT,
  "src",
  "data",
  "public-apps.json"
);

const AUDIENCES = new Set(["student", "teacher", "mixed"]);
const INTERACTION_TYPES = new Set([
  "simulation",
  "practice",
  "collaboration",
  "creation",
  "management",
  "reference",
  "utility"
]);
const GRADE_BANDS = new Set([
  "1-2",
  "3-4",
  "5-6",
  "all",
  "teacher",
  "secondary"
]);

const FIELD_NAMES = [
  "title",
  "summary",
  "url",
  "tags",
  "subject",
  "grade",
  "subjects",
  "gradeBands",
  "audience",
  "interactionType",
  "learningProcess",
  "memo",
  "createdAt",
  "updatedAt"
];

const QUESTION_CATEGORIES = [
  {
    key: "what",
    label: "무엇인가요?",
    required: (app) => hasText(app.title) && hasText(app.summary)
  },
  {
    key: "audience",
    label: "누구를 위한 것인가요?",
    required: (app) =>
      AUDIENCES.has(app.audience) &&
      (hasText(app.grade) || hasItems(app.gradeBands))
  },
  {
    key: "topic",
    label: "어떤 교과·주제인가요?",
    required: (app) =>
      hasText(app.subject) || hasItems(app.subjects) || hasItems(app.tags)
  },
  {
    key: "how",
    label: "어떻게 활용하나요?",
    required: (app) => hasText(app.memo) && hasItems(app.learningProcess)
  },
  {
    key: "freshness",
    label: "언제 수정되었나요?",
    required: (app) => isValidDate(app.updatedAt)
  }
];

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(value) {
  return Array.isArray(value) && value.some((item) => hasText(item));
}

function isValidDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function duplicateValues(apps, field) {
  const counts = new Map();

  for (const app of apps) {
    const value = app[field];
    if (!hasText(value)) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function addIssue(target, app, code, message) {
  target.push({
    id: app?.id ?? null,
    title: app?.title ?? null,
    code,
    message
  });
}

function createFieldPresence(apps) {
  return Object.fromEntries(
    FIELD_NAMES.map((field) => {
      const present = apps.filter((app) => {
        const value = app[field];
        return Array.isArray(value) ? value.length > 0 : hasText(value);
      }).length;

      return [field, { present, missing: apps.length - present }];
    })
  );
}

function createQuestionCoverage(apps) {
  return Object.fromEntries(
    QUESTION_CATEGORIES.map((category) => {
      const covered = apps.filter(category.required).length;
      return [
        category.key,
        {
          label: category.label,
          covered,
          missing: apps.length - covered,
          percentage: apps.length ? Number(((covered / apps.length) * 100).toFixed(1)) : 0
        }
      ];
    })
  );
}

export function auditGeoContent(snapshot, { strict = false } = {}) {
  const errors = [];
  const warnings = [];
  const apps = Array.isArray(snapshot?.apps) ? snapshot.apps : [];

  if (!snapshot || typeof snapshot !== "object") {
    errors.push({ id: null, title: null, code: "invalid_snapshot", message: "스냅샷이 객체가 아닙니다." });
  }

  if (snapshot?.version !== 1) {
    errors.push({ id: null, title: null, code: "invalid_version", message: "스냅샷 version은 1이어야 합니다." });
  }

  if (!Array.isArray(snapshot?.apps)) {
    errors.push({ id: null, title: null, code: "missing_apps", message: "스냅샷 apps가 배열이 아닙니다." });
  }

  if (snapshot?.appCount !== apps.length) {
    errors.push({ id: null, title: null, code: "app_count_mismatch", message: "appCount와 apps 길이가 다릅니다." });
  }

  for (const app of apps) {
    for (const field of ["title", "summary", "url", "tags", "audience", "interactionType", "learningProcess", "memo", "updatedAt"]) {
      const value = app[field];
      const present = Array.isArray(value) ? value.length > 0 : hasText(value);
      if (!present) {
        warnings.push({ id: app.id ?? null, title: app.title ?? null, code: `missing_${field}`, message: `${field} 값이 없습니다.` });
      }
    }

    if (hasText(app.summary) && app.summary.trim().length < 20) {
      warnings.push({ id: app.id ?? null, title: app.title ?? null, code: "short_summary", message: "summary가 20자보다 짧습니다." });
    }

    if (hasText(app.url) && !isHttpUrl(app.url)) {
      addIssue(errors, app, "invalid_url", "url은 http 또는 https URL이어야 합니다.");
    }

    if (app.audience !== undefined && app.audience !== null && !AUDIENCES.has(app.audience)) {
      addIssue(errors, app, "invalid_audience", `허용되지 않은 audience: ${String(app.audience)}`);
    }

    if (
      app.interactionType !== undefined &&
      app.interactionType !== null &&
      !INTERACTION_TYPES.has(app.interactionType)
    ) {
      addIssue(errors, app, "invalid_interaction_type", `허용되지 않은 interactionType: ${String(app.interactionType)}`);
    }

    for (const band of app.gradeBands ?? []) {
      if (!GRADE_BANDS.has(band)) {
        addIssue(errors, app, "invalid_grade_band", `허용되지 않은 gradeBand: ${String(band)}`);
      }
    }

    for (const field of ["createdAt", "updatedAt"]) {
      if (!isValidDate(app[field])) {
        addIssue(errors, app, `invalid_${field}`, `${field}가 유효한 ISO 날짜가 아닙니다.`);
      }
    }

    if (!hasText(app.grade) || !hasItems(app.gradeBands)) {
      warnings.push({ id: app.id ?? null, title: app.title ?? null, code: "missing_grade_context", message: "grade 또는 gradeBands가 없습니다." });
    }

    if (Array.isArray(app.tags) && new Set(app.tags).size !== app.tags.length) {
      warnings.push({ id: app.id ?? null, title: app.title ?? null, code: "duplicate_tags", message: "tags 안에 중복 값이 있습니다." });
    }
  }

  for (const field of ["id", "title", "url"]) {
    for (const duplicate of duplicateValues(apps, field)) {
      errors.push({ id: null, title: null, code: `duplicate_${field}`, message: `${field} 중복: ${duplicate.value} (${duplicate.count}개)` });
    }
  }

  const questionCoverage = createQuestionCoverage(apps);
  const result = {
    ok: errors.length === 0 && (!strict || warnings.length === 0),
    strict,
    snapshot: {
      version: snapshot?.version ?? null,
      appCount: apps.length,
      generatedAt: snapshot?.generatedAt ?? null,
      catalogRevision: snapshot?.catalogRevision ?? null
    },
    fieldPresence: createFieldPresence(apps),
    questionCoverage,
    duplicates: {
      ids: duplicateValues(apps, "id"),
      titles: duplicateValues(apps, "title"),
      urls: duplicateValues(apps, "url")
    },
    errors,
    warnings
  };

  return result;
}

export async function readSnapshot(snapshotPath = DEFAULT_SNAPSHOT_PATH) {
  return JSON.parse(await fs.readFile(snapshotPath, "utf8"));
}

export async function runGeoContentVerification({ snapshotPath = DEFAULT_SNAPSHOT_PATH, strict = false } = {}) {
  const snapshot = await readSnapshot(snapshotPath);
  const result = auditGeoContent(snapshot, { strict });
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }

  return result;
}

function parseArgs(argv) {
  const options = { strict: false, snapshotPath: DEFAULT_SNAPSHOT_PATH };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--strict") {
      options.strict = true;
    } else if (argument === "--snapshot") {
      options.snapshotPath = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  runGeoContentVerification(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(
      `[error] unable to verify GEO content: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  });
}
