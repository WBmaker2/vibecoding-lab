import { gradeBandsToLegacyText } from "./metadata";
import type { PublicAppRecord } from "./types";

export interface AppFaqItem {
  question: string;
  answer: string;
}

const AUDIENCE_LABELS = {
  student: "학생",
  teacher: "교사",
  mixed: "교사와 학생"
} as const;

function getGradeLabel(app: PublicAppRecord) {
  return app.grade ?? (app.gradeBands ? gradeBandsToLegacyText(app.gradeBands) : undefined);
}

function getTopicLabel(app: PublicAppRecord) {
  const subjects = app.subjects?.filter(Boolean) ?? [];
  if (subjects.length > 0) return subjects.join(" · ");
  return app.subject;
}

export function createAppFaqItems(app: PublicAppRecord): AppFaqItem[] {
  const items: AppFaqItem[] = [
    {
      question: `${app.title}은 무엇인가요?`,
      answer: app.summary
    }
  ];
  const audience = app.audience ? AUDIENCE_LABELS[app.audience] : undefined;
  const grade = getGradeLabel(app);
  const audienceAndGrade = [
    audience,
    grade && !(audience === "교사" && grade === "교사용") ? grade : undefined
  ]
    .filter(Boolean)
    .join(" · ");

  if (audienceAndGrade) {
    items.push({
      question: `${app.title}는 누구를 위한 앱인가요?`,
      answer: `대상은 ${audienceAndGrade}입니다.`
    });
  }

  const topic = getTopicLabel(app);
  if (topic) {
    items.push({
      question: `${app.title}는 어떤 교과·주제를 다루나요?`,
      answer: `이 앱은 ${topic} 관련 활동을 다룹니다.`
    });
  }

  const process = app.learningProcess?.filter(Boolean) ?? [];
  if (process.length > 0 || app.memo) {
    const processText = process.length > 0 ? `활동 순서는 ${process.join(" → ")}입니다.` : "";
    const memoText = app.memo?.trim() ?? "";
    items.push({
      question: `${app.title}를 어떻게 활용하나요?`,
      answer: [processText, memoText].filter(Boolean).join(" ")
    });
  }

  return items.slice(0, 5);
}
