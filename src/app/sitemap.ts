import type { MetadataRoute } from "next";
import { createAppPath } from "@/lib/apps/app-slug";
import { listStaticPublicApps } from "@/lib/apps/static-public-apps";
import type { PublicAppRecord } from "@/lib/apps/types";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo/site-url";

export function createSitemap(
  apps: readonly PublicAppRecord[],
  siteUrl?: string
): MetadataRoute.Sitemap {
  const latestUpdate = apps.reduce<Date | undefined>(
    (latest, app) =>
      !latest || app.updatedAt > latest ? app.updatedAt : latest,
    undefined
  );

  return [
    {
      url: getSiteUrl(siteUrl).toString(),
      ...(latestUpdate ? { lastModified: latestUpdate } : {}),
      changeFrequency: "weekly",
      priority: 1
    },
    ...apps.map((app) => ({
      url: getAbsoluteUrl(createAppPath(app), siteUrl),
      lastModified: app.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8
    }))
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return createSitemap(listStaticPublicApps());
}
