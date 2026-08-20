export const DEFAULT_SITE_URL = "https://www.vibehong.shop";
export const SITE_NAME = "Hong's Vibe Coding Lab";
export const SITE_TITLE =
  "Hong's Vibe Coding Lab | 교사용 웹앱·수업 도구 아카이브";
export const SITE_DESCRIPTION =
  "초등 수업과 교사 업무를 가볍게 만드는 웹앱 모음입니다. 영어·수학·과학 수업 도구, 학급 운영, 교사 업무경감 앱을 교과와 학년별로 찾아보세요.";

function ensureProtocol(siteUrl: string) {
  return /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`;
}

export function getSiteUrl(
  siteUrl = process.env.APP_BASE_URL?.trim() || DEFAULT_SITE_URL
): URL {
  try {
    const parsed = new URL(ensureProtocol(siteUrl.trim()));

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new URL(DEFAULT_SITE_URL);
    }

    return new URL(parsed.origin);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export function getAbsoluteUrl(pathname: string, siteUrl?: string): string {
  return new URL(pathname, getSiteUrl(siteUrl)).toString();
}
