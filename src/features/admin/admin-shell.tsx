import {
  createAppAction,
  deleteAppAction,
  logoutAction,
  updateAppAction
} from "@/app/admin/actions";
import type { AppRecord } from "@/lib/apps/types";
import { AdminWorkspace } from "./admin-workspace";

interface AdminShellProps {
  apps: AppRecord[];
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
      suggestedTags={suggestedTags}
      updateAction={updateAppAction}
    />
  );
}
