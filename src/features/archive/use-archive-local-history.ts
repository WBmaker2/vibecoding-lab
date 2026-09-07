"use client";

import { useEffect, useMemo, useState } from "react";

const FAVORITES_KEY = "hvc-archive-favorites";
const RECENT_KEY = "hvc-archive-recent";
const MAX_RECENT_APPS = 8;

function readIds(
  key: string,
  knownIds: ReadonlySet<string>,
  limit = Number.POSITIVE_INFINITY
) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return [
      ...new Set(
        stored.filter(
          (value): value is string =>
            typeof value === "string" && knownIds.has(value)
        )
      )
    ].slice(0, limit);
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Local history is optional; the current page should remain usable.
  }
}

export function useArchiveLocalHistory(appIds: readonly string[]) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const knownIds = useMemo(() => new Set(appIds), [appIds]);

  useEffect(() => {
    function readHistory() {
      setFavoriteIds(readIds(FAVORITES_KEY, knownIds));
      setRecentIds(readIds(RECENT_KEY, knownIds, MAX_RECENT_APPS));
    }

    readHistory();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_KEY || event.key === RECENT_KEY) {
        readHistory();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [knownIds]);

  function toggleFavorite(appId: string) {
    setFavoriteIds((current) => {
      const nextIds = current.includes(appId)
        ? current.filter((id) => id !== appId)
        : [...current, appId];
      writeIds(FAVORITES_KEY, nextIds);
      return nextIds;
    });
  }

  function recordRecent(appId: string) {
    setRecentIds((current) => {
      const nextIds = [appId, ...current.filter((id) => id !== appId)].slice(
        0,
        MAX_RECENT_APPS
      );
      writeIds(RECENT_KEY, nextIds);
      return nextIds;
    });
  }

  function clearFavorites() {
    setFavoriteIds([]);
    writeIds(FAVORITES_KEY, []);
  }

  function clearRecent() {
    setRecentIds([]);
    writeIds(RECENT_KEY, []);
  }

  return {
    clearFavorites,
    clearRecent,
    favoriteIds,
    recentIds,
    recordRecent,
    toggleFavorite
  };
}
