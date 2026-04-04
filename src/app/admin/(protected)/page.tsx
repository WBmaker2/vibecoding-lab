import { AdminShell } from "@/features/admin/admin-shell";
import { getAppRepository } from "@/lib/apps/repository";

export default async function AdminPage() {
  const repo = getAppRepository();
  const apps = await repo.listAdminApps();

  return <AdminShell apps={apps} />;
}
