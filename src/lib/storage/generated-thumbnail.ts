function stripProtocol(value: string) {
  return value.replace(/^https?:\/\//, "");
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function getGeneratedThumbnailBaseUrl() {
  const appBaseUrl = process.env.APP_BASE_URL?.trim();

  if (appBaseUrl) {
    return normalizeBaseUrl(appBaseUrl);
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (productionUrl) {
    return `https://${stripProtocol(productionUrl)}`;
  }

  const deploymentUrl = process.env.VERCEL_URL?.trim();

  if (deploymentUrl) {
    return `https://${stripProtocol(deploymentUrl)}`;
  }

  return "http://localhost:3000";
}

export function getThumbnailHostLabel(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface BuildGeneratedThumbnailUrlOptions {
  sourceUrl: string;
  title?: string | null;
}

export function buildGeneratedThumbnailUrl({
  sourceUrl,
  title
}: BuildGeneratedThumbnailUrlOptions) {
  const host = getThumbnailHostLabel(sourceUrl);

  if (!host) {
    return null;
  }

  const target = new URL("/api/thumbnail", getGeneratedThumbnailBaseUrl());
  target.searchParams.set("host", host);

  if (title?.trim()) {
    target.searchParams.set("title", title.trim());
  }

  return target.toString();
}
