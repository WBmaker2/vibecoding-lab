import { AdminShell } from "@/features/admin/admin-shell";
import { getAppRepository } from "@/lib/apps/repository";
import { getStaticGalleryAssetIntegrity } from "@/lib/apps/static-gallery-asset-integrity";
import { getStaticGalleryBaseline } from "@/lib/apps/static-public-apps";

export default async function AdminPage() {
  const repo = getAppRepository();
  const apps = await repo.listAdminApps();
  const baseline = getStaticGalleryBaseline();
  const assetIntegrity = await getStaticGalleryAssetIntegrity(baseline);

  return (
    <AdminShell
      apps={apps}
      assetIntegrity={assetIntegrity}
      baseline={baseline}
    />
  );
}
