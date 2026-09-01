export const DEFAULT_SITE_URL = "https://www.vibehong.shop";
export const SITE_REPOSITORY = "https://github.com/WBmaker2/vibecoding-lab";
export const SITE_BRAND = "바이브홍";
export const SITE_NAME = "Hong's Vibe Coding Lab";
export const SITE_TITLE =
  "바이브홍 | Hong's Vibe Coding Lab | 교사용 웹앱·수업 도구 아카이브";
export const SITE_DESCRIPTION =
  "바이브홍이 만든 교실 수업·교사 업무용 웹앱 아카이브입니다. 영어·수학·과학 수업 도구, 학급 운영, 교사 업무경감 앱을 교과와 학년별로 찾아보세요.";

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
