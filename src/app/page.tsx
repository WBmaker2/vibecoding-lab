import { JsonLd } from "@/components/seo/json-ld";
import { ArchivePage } from "@/features/archive/archive-page";
import { listStaticPublicApps } from "@/lib/apps/static-public-apps";
import { createSiteStructuredData } from "@/lib/seo/structured-data";

export const dynamic = "force-static";

export default function HomePage() {
  const apps = listStaticPublicApps();

  return (
    <>
      <JsonLd data={createSiteStructuredData(apps)} />
      <ArchivePage initialApps={apps} />
    </>
  );
}
