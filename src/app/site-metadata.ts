import type { Metadata } from "next";
import {
  DEFAULT_SITE_URL,
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE
} from "@/lib/seo/site-url";

interface SiteMetadataOptions {
  googleVerification?: string;
  naverVerification?: string;
}

export function createSiteMetadata(
  siteUrl = process.env.APP_BASE_URL ?? DEFAULT_SITE_URL,
  options: SiteMetadataOptions = {
    googleVerification: process.env.GOOGLE_SITE_VERIFICATION,
    naverVerification: process.env.NAVER_SITE_VERIFICATION
  }
): Metadata {
  const verification =
    options.googleVerification || options.naverVerification
      ? {
          ...(options.googleVerification
            ? { google: options.googleVerification }
            : {}),
          ...(options.naverVerification
            ? {
                other: {
                  "naver-site-verification": options.naverVerification
                }
              }
            : {})
        }
      : undefined;

  return {
    metadataBase: getSiteUrl(siteUrl),
    title: {
      default: SITE_TITLE,
      template: `%s | ${SITE_NAME}`
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    alternates: {
      canonical: "/"
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    keywords: [
      "교사용 웹앱",
      "교사 업무경감",
      "교수 학습용 소프트웨어",
      "교실 수업 도구",
      "Hong's Vibe Coding Lab"
    ],
    ...(verification ? { verification } : {}),
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      locale: "ko_KR",
      siteName: SITE_NAME,
      type: "website",
      url: "/",
      images: [
        {
          url: "/og-image",
          width: 1200,
          height: 630,
          alt: "Hong's Vibe Coding Lab 브랜드 프리뷰"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: ["/og-image"]
    },
    icons: {
      icon: [{ url: "/icon", sizes: "any" }],
      apple: [{ url: "/apple-icon", sizes: "180x180" }],
      shortcut: [{ url: "/icon" }]
    },
    manifest: "/manifest.webmanifest"
  };
}

export const siteMetadata = createSiteMetadata();
