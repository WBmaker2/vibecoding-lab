import { createAppPath } from "@/lib/apps/app-slug";
import { gradeBandsToLegacyText } from "@/lib/apps/metadata";
import type { PublicAppRecord } from "@/lib/apps/types";
import { getAbsoluteUrl, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "./site-url";

const AUDIENCE_LABELS = {
  student: "학생",
  teacher: "교사",
  mixed: "교사와 학생"
} as const;

function isText(value: string | undefined): value is string {
  return Boolean(value);
}

function oneLine(value: string) {
  return value
    .replace(/[\r\n\t]+/gu, " ")
    .replace(/\s{2,}/gu, " ")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .trim();
}

function appContext(app: PublicAppRecord) {
  const audience = app.audience ? AUDIENCE_LABELS[app.audience] : undefined;
  const grade = app.grade ?? (app.gradeBands ? gradeBandsToLegacyText(app.gradeBands) : undefined);
  const subjects = app.subjects?.filter(Boolean) ?? [];
  const subject = subjects.length > 0 ? subjects.join(" · ") : app.subject;
  return [audience, grade, subject].filter(isText).map(oneLine).join(" · ");
}

export function createLlmsText(
  apps: readonly PublicAppRecord[],
  siteUrl?: string
) {
  const rootUrl = getSiteUrl(siteUrl).toString();
  const appLines = apps.map((app) => {
    const context = appContext(app);
    const details = [oneLine(app.summary), context, `수정일 ${app.updatedAt.toISOString().slice(0, 10)}`]
      .filter(Boolean)
      .join(" · ");
    return `- [${oneLine(app.title)}](${getAbsoluteUrl(createAppPath(app), siteUrl)}): ${details}`;
  });

  return [
    `# ${SITE_NAME}`,
    "",
    `> ${oneLine(SITE_DESCRIPTION)}`,
    "",
    "이 문서는 공개 앱 아카이브의 핵심 페이지와 사실 정보를 에이전트가 찾기 쉽게 정리한 안내서입니다.",
    "",
    "## 핵심 페이지",
    `- [앱 아카이브](${rootUrl}): 교실 수업과 교사 업무에 사용하는 공개 웹앱 목록`,
    "",
    "## 앱 목록",
    ...appLines,
    "",
    "## 데이터·인용 정책",
    "- 앱 이름, 요약, 대상, 교과, 활용 과정은 공개 아카이브의 정적 스냅샷과 앱 상세 페이지를 기준으로 합니다.",
    "- 앱 상세 페이지의 수정일을 확인하고, 오래된 정보는 최신 페이지와 대조합니다.",
    `- 사실을 인용할 때는 해당 앱의 상세 URL(${getAbsoluteUrl("/apps/...", siteUrl)})을 출처로 표시합니다.`,
    "- llms.txt는 안내용 제안 규격이며 검색 노출이나 AI 인용을 보장하지 않습니다.",
    ""
  ].join("\n");
}
