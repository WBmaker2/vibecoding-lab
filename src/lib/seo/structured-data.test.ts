import type { PublicAppRecord } from "@/lib/apps/types";
import {
  createAppStructuredData,
  createCollectionStructuredData,
  createSiteStructuredData
} from "./structured-data";

const app: PublicAppRecord = {
  id: "b5c444ba-0d76-4bc5-b787-3132985da0d3",
  title: "PDF to PNG 1080p",
  summary: "PDF를 PNG 이미지로 변환하는 교사용 도구",
  url: "https://example.net/pdf-tool",
  tags: ["PDF", "업무"],
  thumbnailMode: "upload",
  thumbnailUrl: "/app-thumbnails/sample.png",
  subject: "공통",
  grade: "교사용",
  audience: "teacher",
  createdAt: new Date("2026-05-03T09:33:29.709Z"),
  updatedAt: new Date("2026-07-23T09:14:28.416Z")
};

describe("SEO structured data", () => {
  it("describes the archive as a CollectionPage with detail URLs", () => {
    const data = createCollectionStructuredData([app], "https://example.com");

    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      url: "https://example.com/",
      inLanguage: "ko-KR",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: 1
      }
    });
    expect(data.mainEntity.itemListElement[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: app.title
    });
    expect(data.mainEntity.itemListElement[0].url).toContain("/apps/pdf-to-png-1080p-");
  });

  it("uses only known app facts for SoftwareApplication and breadcrumbs", () => {
    const data = createAppStructuredData(app, "https://example.com");

    expect(data.softwareApplication).toMatchObject({
      "@type": "SoftwareApplication",
      name: app.title,
      description: app.summary,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      sameAs: app.url
    });
    expect(data.softwareApplication).not.toHaveProperty("aggregateRating");
    expect(data.softwareApplication).not.toHaveProperty("review");
    expect(data.softwareApplication.publisher).toEqual({
      "@id": "https://example.com/#organization"
    });
    expect(data.breadcrumbList.itemListElement).toHaveLength(2);
    expect(data.faqPage).toMatchObject({
      "@type": "FAQPage",
      "@id": expect.stringContaining("#faq")
    });
    expect(data.faqPage.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: "PDF to PNG 1080p은 무엇인가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: app.summary
      }
    });
  });

  it("connects the site, publisher, and collection as one entity graph", () => {
    const data = createSiteStructuredData([app], "https://example.com");
    const [organization, website, collection] = data["@graph"];

    expect(data).toMatchObject({ "@context": "https://schema.org" });
    expect(organization).toMatchObject({
      "@type": "Organization",
      "@id": "https://example.com/#organization",
      name: "Hong's Vibe Coding Lab",
      alternateName: "바이브홍",
      logo: "https://example.com/icon",
      sameAs: ["https://github.com/WBmaker2/vibecoding-lab"]
    });
    expect(website).toMatchObject({
      "@type": "WebSite",
      "@id": "https://example.com/#website",
      alternateName: "바이브홍",
      publisher: { "@id": "https://example.com/#organization" }
    });
    expect(collection).toMatchObject({
      "@type": "CollectionPage",
      "@id": "https://example.com/#collection",
      isPartOf: { "@id": "https://example.com/#website" },
      publisher: { "@id": "https://example.com/#organization" }
    });
  });
});
