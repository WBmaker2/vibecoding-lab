import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { AppDetailPage } from "@/features/app-detail/app-detail-page";
import {
  createAppPath,
  createAppSlug,
  findAppBySlug
} from "@/lib/apps/app-slug";
import { getRelatedApps } from "@/lib/apps/related-apps";
import { listStaticPublicApps } from "@/lib/apps/static-public-apps";
import { createAppStructuredData } from "@/lib/seo/structured-data";
import { SITE_NAME } from "@/lib/seo/site-url";

interface AppRouteProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = true;

export function generateStaticParams() {
  return listStaticPublicApps().map((app) => ({
    slug: createAppSlug(app)
  }));
}

export async function generateMetadata({
  params
}: AppRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const app = findAppBySlug(listStaticPublicApps(), slug);

  if (!app) {
    return {
      title: "앱을 찾을 수 없습니다",
      robots: { index: false, follow: false }
    };
  }

  const canonicalPath = createAppPath(app);
  const images = app.thumbnailUrl
    ? [{ url: app.thumbnailUrl, alt: `${app.title} 미리보기` }]
    : [{ url: "/og-image", alt: `${SITE_NAME} 브랜드 프리뷰` }];

  return {
    title: app.title,
    description: app.summary,
    keywords: app.tags,
    alternates: {
      canonical: canonicalPath
    },
    robots: {
      index: true,
      follow: true
    },
    openGraph: {
      title: app.title,
      description: app.summary,
      type: "website",
      locale: "ko_KR",
      siteName: SITE_NAME,
      url: canonicalPath,
      images
    },
    twitter: {
      card: "summary_large_image",
      title: app.title,
      description: app.summary,
      images: [images[0].url]
    }
  };
}

export default async function AppPage({ params }: AppRouteProps) {
  const { slug } = await params;
  const apps = listStaticPublicApps();
  const app = findAppBySlug(apps, slug);

  if (!app) {
    notFound();
  }

  const canonicalSlug = createAppSlug(app);

  if (slug !== canonicalSlug) {
    redirect(createAppPath(app));
  }

  const relatedApps = getRelatedApps(app, apps);
  const structuredData = createAppStructuredData(app);

  return (
    <>
      <JsonLd data={structuredData.softwareApplication} />
      <JsonLd data={structuredData.breadcrumbList} />
      <JsonLd data={structuredData.faqPage} />
      <AppDetailPage app={app} relatedApps={relatedApps} />
    </>
  );
}
