import {
  createAppAction,
  deleteAppAction,
  logoutAction,
  removeAppTagAction,
  updateAppAction
} from "@/app/admin/actions";
import type { AdminAppRecord } from "@/lib/apps/types";
import { AdminWorkspace } from "./admin-workspace";

interface AdminShellProps {
  apps: AdminAppRecord[];
}

export function AdminShell({ apps }: AdminShellProps) {
  const suggestedTags = [...new Set(apps.flatMap((app) => app.tags))].sort(
    (left, right) => left.localeCompare(right, "ko")
  );

  return (
    <AdminWorkspace
      apps={apps}
      createAction={createAppAction}
      deleteAction={deleteAppAction}
      logoutAction={logoutAction}
      removeTagAction={removeAppTagAction}
      suggestedTags={suggestedTags}
      updateAction={updateAppAction}
    />
  );
}
