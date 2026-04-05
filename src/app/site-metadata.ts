import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://hongs-vibe-coding-lab.vercel.app";

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
}

export function createSiteMetadata(
  siteUrl = process.env.APP_BASE_URL ?? DEFAULT_SITE_URL
): Metadata {
  return {
    metadataBase: new URL(normalizeSiteUrl(siteUrl)),
    title: {
      default: "Hong's Vibe Coding Lab",
      template: "%s | Hong's Vibe Coding Lab"
    },
    description: "교사용 웹앱을 소개하는 미니멀 아카이브",
    applicationName: "Hong's Vibe Coding Lab",
    keywords: [
      "교사용 웹앱",
      "교사 업무경감",
      "교수 학습용 소프트웨어",
      "교실 수업 도구",
      "Hong's Vibe Coding Lab"
    ],
    openGraph: {
      title: "Hong's Vibe Coding Lab",
      description: "교실 수업과 교사 업무를 가볍게 만드는 웹앱 아카이브",
      locale: "ko_KR",
      siteName: "Hong's Vibe Coding Lab",
      type: "website",
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
      title: "Hong's Vibe Coding Lab",
      description: "교실 수업과 교사 업무를 가볍게 만드는 웹앱 아카이브",
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
