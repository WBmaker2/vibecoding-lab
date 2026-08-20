import type { PublicAppRecord } from "./types";

const UUID_AT_END =
  /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function slugifyAppTitle(title: string): string {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyAppUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathHint = parsed.pathname
      .split("/")
      .filter(Boolean)
      .filter((segment) => !/^index(?:\.html?)?$/i.test(segment))
      .join("-");
    const hostHint = parsed.hostname.split(".")[0];

    return slugifyAppTitle(pathHint || hostHint);
  } catch {
    return "";
  }
}

function createReadableSlug(
  app: Pick<PublicAppRecord, "title" | "url">
): string {
  const titleHint = slugifyAppTitle(app.title);
  const urlHint = slugifyAppUrl(app.url);

  if (titleHint.split("-").filter(Boolean).length >= 2) {
    return titleHint;
  }

  if (titleHint && urlHint && !urlHint.includes(titleHint)) {
    return `${titleHint}-${urlHint}`;
  }

  return titleHint || urlHint || "classroom-app";
}

export function createAppSlug(
  app: Pick<PublicAppRecord, "id" | "title" | "url">
): string {
  return `${createReadableSlug(app)}-${app.id.toLowerCase()}`;
}

export function createAppPath(
  app: Pick<PublicAppRecord, "id" | "title" | "url">
): string {
  return `/apps/${createAppSlug(app)}`;
}

export function getAppIdFromSlug(slug: string): string | null {
  try {
    const decoded = decodeURIComponent(slug);
    return decoded.match(UUID_AT_END)?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export function findAppBySlug(
  apps: readonly PublicAppRecord[],
  slug: string
): PublicAppRecord | undefined {
  const exactMatch = apps.find((app) => createAppSlug(app) === slug);

  if (exactMatch) {
    return exactMatch;
  }

  const appId = getAppIdFromSlug(slug);
  return appId ? apps.find((app) => app.id.toLowerCase() === appId) : undefined;
}
