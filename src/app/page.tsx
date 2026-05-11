import { ArchivePage } from "@/features/archive/archive-page";
import { listStaticPublicApps } from "@/lib/apps/static-public-apps";

export const dynamic = "force-static";

export default function HomePage() {
  const apps = listStaticPublicApps();

  return <ArchivePage initialApps={apps} />;
}
