import { AdminShell } from "@/features/admin/admin-shell";
import { getAppRepository } from "@/lib/apps/repository";
import { getStaticGalleryBaseline } from "@/lib/apps/static-public-apps";

export default async function AdminPage() {
  const repo = getAppRepository();
  const apps = await repo.listAdminApps();
  const baseline = getStaticGalleryBaseline();

  return <AdminShell apps={apps} baseline={baseline} />;
}
