import { redirect } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { AdminDatabaseFallback } from "@/features/admin/admin-database-fallback";
import { loadAdminPageData } from "@/lib/apps/admin-page-data";
import { hasAdminSession } from "@/lib/auth/session";

export default async function AdminPage() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }

  const { apps, assetIntegrity, baseline, dataSource } =
    await loadAdminPageData();

  if (dataSource.kind === "static-fallback") {
    return (
      <AdminDatabaseFallback
        apps={apps}
        baseline={baseline}
        reason={dataSource.reason}
      />
    );
  }

  return (
    <AdminShell
      apps={apps}
      assetIntegrity={assetIntegrity}
      baseline={baseline}
    />
  );
}
