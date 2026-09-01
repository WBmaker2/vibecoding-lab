import { createAppPath } from "@/lib/apps/app-slug";
import { createAppFaqItems } from "@/lib/apps/app-faq";
import type { PublicAppRecord } from "@/lib/apps/types";
import {
  getAbsoluteUrl,
  getSiteUrl,
  SITE_BRAND,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_REPOSITORY
} from "./site-url";

const AUDIENCE_LABELS = {
  student: "학생",
  teacher: "교사",
  mixed: "교사와 학생"
} as const;

function createCollectionNode(
  apps: readonly PublicAppRecord[],
  siteUrl?: string
) {
  const rootUrl = getSiteUrl(siteUrl).toString();

  return {
    "@type": "CollectionPage",
    "@id": `${rootUrl}#collection`,
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

export function createCollectionStructuredData(
  apps: readonly PublicAppRecord[],
  siteUrl?: string
) {
  return {
    "@context": "https://schema.org",
    ...createCollectionNode(apps, siteUrl)
  };
}

export function createSiteStructuredData(
  apps: readonly PublicAppRecord[],
  siteUrl?: string
) {
  const rootUrl = getSiteUrl(siteUrl).toString();
  const organizationId = `${rootUrl}#organization`;
  const websiteId = `${rootUrl}#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        alternateName: SITE_BRAND,
        description: SITE_DESCRIPTION,
        url: rootUrl,
        logo: getAbsoluteUrl("/icon", siteUrl),
        sameAs: [SITE_REPOSITORY],
        inLanguage: "ko-KR"
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        alternateName: SITE_BRAND,
        description: SITE_DESCRIPTION,
        url: rootUrl,
        inLanguage: "ko-KR",
        publisher: { "@id": organizationId }
      },
      {
        ...createCollectionNode(apps, siteUrl),
        isPartOf: { "@id": websiteId },
        publisher: { "@id": organizationId }
      }
    ]
  };
}

export function createAppStructuredData(app: PublicAppRecord, siteUrl?: string) {
  const rootUrl = getSiteUrl(siteUrl).toString();
  const detailUrl = getAbsoluteUrl(createAppPath(app), siteUrl);
  const faqItems = createAppFaqItems(app);
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
    publisher: {
      "@id": `${rootUrl}#organization`
    },
    isPartOf: {
      "@type": "CollectionPage",
      "@id": `${rootUrl}#collection`,
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

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${detailUrl}#faq`,
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return { softwareApplication, breadcrumbList, faqPage };
}
