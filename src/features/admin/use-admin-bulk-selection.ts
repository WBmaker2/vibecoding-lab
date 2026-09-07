import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { normalizeAppMetadata } from "@/lib/apps/metadata";
import type { AdminAppRecord } from "@/lib/apps/types";
import type { RecentAdminChange } from "./change-highlights";
import type {
  BulkClassificationUpdate,
  BulkTagUpdate
} from "./admin-bulk-actions";

interface UseAdminBulkSelectionOptions {
  apps: AdminAppRecord[];
  setApps: Dispatch<SetStateAction<AdminAppRecord[]>>;
  setRecentChange: Dispatch<SetStateAction<RecentAdminChange | null>>;
}

export function useAdminBulkSelection({
  apps,
  setApps,
  setRecentChange
}: UseAdminBulkSelectionOptions) {
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(
    () => new Set()
  );
  const selectedApps = useMemo(
    () => apps.filter((app) => selectedAppIds.has(app.id)),
    [apps, selectedAppIds]
  );

  function toggleAppSelection(appId: string) {
    setSelectedAppIds((current) => {
      const next = new Set(current);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedAppIds(new Set());
  }

  function applyTagUpdates(updates: BulkTagUpdate[]) {
    const updateMap = new Map(updates.map((update) => [update.id, update.tags]));
    const changedUpdates = updates.filter((update) => {
      const current = apps.find((app) => app.id === update.id);
      return current?.tags.join("|") !== update.tags.join("|");
    });

    setApps((currentApps) =>
      currentApps.map((app) => {
        const tags = updateMap.get(app.id);
        return tags ? { ...app, tags, updatedAt: new Date() } : app;
      })
    );
    if (changedUpdates.length > 0) {
      setRecentChange({ appId: changedUpdates[0].id, fields: ["태그"] });
    }
    clearSelection();
  }

  function applyClassificationUpdates(updates: BulkClassificationUpdate[]) {
    const updateMap = new Map(updates.map((update) => [update.id, update]));
    const changedUpdates = updates.filter((update) => {
      const current = apps.find((app) => app.id === update.id);
      return current && current[update.field] !== update.value;
    });

    setApps((currentApps) =>
      currentApps.map((app) => {
        const update = updateMap.get(app.id);
        if (!update) return app;

        const nextSource = {
          ...app,
          [update.field]: update.value,
          subjects: update.field === "subject" ? undefined : app.subjects,
          gradeBands: update.field === "grade" ? undefined : app.gradeBands
        };
        return {
          ...app,
          ...nextSource,
          ...normalizeAppMetadata(nextSource),
          updatedAt: new Date()
        };
      })
    );
    if (changedUpdates.length > 0) {
      setRecentChange({ appId: changedUpdates[0].id, fields: ["분류"] });
    }
    clearSelection();
  }

  return {
    applyClassificationUpdates,
    applyTagUpdates,
    clearSelection,
    selectedAppIds,
    selectedApps,
    toggleAppSelection
  };
}
