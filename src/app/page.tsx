import { ArchivePage } from "@/features/archive/archive-page";
import { getAppRepository } from "@/lib/apps/repository";

export default async function HomePage() {
  const repo = getAppRepository();
  const apps = await repo.listPublicApps();

  return <ArchivePage initialApps={apps} />;
}
