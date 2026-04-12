"use client";

import { startTransition, useMemo, useState } from "react";
import type { PublicAppRecord } from "@/lib/apps/types";
import { filterApps } from "@/lib/search/filter-apps";
import { AppCard } from "./app-card";
import { ArchiveHero } from "./archive-hero";
import { ArchiveResultsState } from "./archive-results-state";
import { EmptyState } from "./empty-state";

interface ArchivePageProps {
  initialApps: PublicAppRecord[];
}

export function ArchivePage({ initialApps }: ArchivePageProps) {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const availableTags = useMemo(
    () =>
      [...new Set(initialApps.flatMap((app) => app.tags))].sort((left, right) =>
        left.localeCompare(right, "ko")
      ),
    [initialApps]
  );

  const filteredApps = useMemo(
    () => filterApps(initialApps, query, activeTags),
    [activeTags, initialApps, query]
  );

  function toggleTag(tag: string) {
    startTransition(() => {
      setActiveTags((current) =>
        current.includes(tag)
          ? current.filter((item) => item !== tag)
          : [...current, tag]
      );
    });
  }

  return (
    <main className="page-shell archive-page">
      <ArchiveHero
        activeTags={activeTags}
        onQueryChange={setQuery}
        onToggleTag={toggleTag}
        query={query}
        tags={availableTags}
      />

      <section className="archive-results">
        <ArchiveResultsState
          activeTags={activeTags}
          onReset={() =>
            startTransition(() => {
              setActiveTags([]);
              setQuery("");
            })
          }
          query={query}
          resultCount={filteredApps.length}
        />

        {filteredApps.length > 0 ? (
          <div className="app-grid">
            {filteredApps.map((app) => (
              <AppCard app={app} key={app.id} />
            ))}
          </div>
        ) : (
          <EmptyState query={query} />
        )}
      </section>
    </main>
  );
}
