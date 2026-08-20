import { createAppPath, createAppSlug } from "@/lib/apps/app-slug";
import { listStaticPublicApps } from "@/lib/apps/static-public-apps";
import { generateMetadata, generateStaticParams } from "./page";

describe("static app detail route", () => {
  it("pre-generates every app in the static gallery", () => {
    const apps = listStaticPublicApps();
    const params = generateStaticParams();

    expect(params).toHaveLength(apps.length);
    expect(params).toContainEqual({ slug: createAppSlug(apps[0]) });
  });

  it("returns app-specific canonical and social metadata", async () => {
    const app = listStaticPublicApps()[0];
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: createAppSlug(app) })
    });

    expect(metadata.title).toBe(app.title);
    expect(metadata.description).toBe(app.summary);
    expect(metadata.alternates).toEqual({ canonical: createAppPath(app) });
    expect(metadata.openGraph).toMatchObject({
      title: app.title,
      url: createAppPath(app)
    });
  });
});
