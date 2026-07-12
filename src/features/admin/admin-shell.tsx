import {
  createAppAction,
  deleteAppAction,
  logoutAction,
  removeAppTagAction,
  updateAppAction
} from "@/app/admin/actions";
import type { AdminAppRecord } from "@/lib/apps/types";
import type { StaticGalleryBaseline } from "@/lib/apps/static-gallery-sync-state";
import { AdminWorkspace } from "./admin-workspace";

interface AdminShellProps {
  apps: AdminAppRecord[];
  baseline: StaticGalleryBaseline;
}

export function AdminShell({ apps, baseline }: AdminShellProps) {
  const suggestedTags = [...new Set(apps.flatMap((app) => app.tags))].sort(
    (left, right) => left.localeCompare(right, "ko")
  );

  return (
    <AdminWorkspace
      apps={apps}
      baseline={baseline}
      createAction={createAppAction}
      deleteAction={deleteAppAction}
      logoutAction={logoutAction}
      removeTagAction={removeAppTagAction}
      suggestedTags={suggestedTags}
      updateAction={updateAppAction}
    />
  );
}
