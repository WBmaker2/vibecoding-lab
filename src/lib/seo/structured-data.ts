import { createAppPath } from "@/lib/apps/app-slug";
import type { PublicAppRecord } from "@/lib/apps/types";
import {
  getAbsoluteUrl,
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME
} from "./site-url";

const AUDIENCE_LABELS = {
  student: "학생",
  teacher: "교사",
  mixed: "교사와 학생"
} as const;

export function createCollectionStructuredData(
  apps: readonly PublicAppRecord[],
  siteUrl?: string
) {
  const rootUrl = getSiteUrl(siteUrl).toString();

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: rootUrl,
    inLanguage: "ko-KR",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: apps.length,
      itemListElement: apps.map((app, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: app.title,
        url: getAbsoluteUrl(createAppPath(app), siteUrl)
      }))
    }
  };
}

export function createAppStructuredData(app: PublicAppRecord, siteUrl?: string) {
  const rootUrl = getSiteUrl(siteUrl).toString();
  const detailUrl = getAbsoluteUrl(createAppPath(app), siteUrl);
  const image = app.thumbnailUrl
    ? getAbsoluteUrl(app.thumbnailUrl, siteUrl)
    : undefined;
  const audienceType = app.audience ? AUDIENCE_LABELS[app.audience] : undefined;

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.title,
    description: app.summary,
    url: detailUrl,
    sameAs: app.url,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: "ko-KR",
    keywords: app.tags.join(", "),
    dateCreated: app.createdAt.toISOString(),
    dateModified: app.updatedAt.toISOString(),
    ...(image ? { image } : {}),
    ...(audienceType
      ? {
          audience: {
            "@type": "EducationalAudience",
            educationalRole: audienceType
          }
        }
      : {}),
    isPartOf: {
      "@type": "CollectionPage",
      name: SITE_NAME,
      url: rootUrl
    },
    mainEntityOfPage: detailUrl
  };

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "앱 아카이브",
        item: rootUrl
      },
      {
        "@type": "ListItem",
        position: 2,
        name: app.title,
        item: detailUrl
      }
    ]
  };

  return { softwareApplication, breadcrumbList };
}
