"use client";

import Image from "next/image";
import { startTransition, useMemo, useState } from "react";
import type { AppRecord } from "@/lib/apps/types";
import { filterApps } from "@/lib/search/filter-apps";
import { AppCard } from "./app-card";
import { EmptyState } from "./empty-state";
import { SearchBar } from "./search-bar";
import { TagFilterBar } from "./tag-filter-bar";

interface ArchivePageProps {
  initialApps: AppRecord[];
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
      <section className="hero-frame archive-hero">
        <div className="archive-hero-top">
          <div className="archive-hero-copy">
            <p className="eyebrow">Minimal Archive for Classroom Apps</p>
            <h1>Hong&apos;s Vibe Coding Lab</h1>
            <p className="hero-copy">
              교실 수업과 교사 업무를 가볍게 만드는 웹앱을 차분한 아카이브
              형태로 소개합니다.
            </p>
          </div>

          <div className="archive-hero-mascot">
            <p className="mascot-note">
              태그를 눌러 수업 상황별로 빠르게 둘러보세요. 필요한 도구만 가볍게
              골라볼 수 있습니다.
            </p>
            <Image
              alt="태그 탐색을 안내하는 Hong 캐릭터"
              className="archive-hero-mascot-image"
              height={156}
              priority
              src="/images/mascots/hong-default.png"
              width={156}
            />
          </div>
        </div>

        <SearchBar query={query} onQueryChange={setQuery} />
        <p className="tag-copy">태그로 탐색</p>
        <TagFilterBar
          activeTags={activeTags}
          onToggleTag={toggleTag}
          tags={availableTags}
        />
      </section>

      <section className="archive-results">
        <div className="archive-results-bar">
          <p>
            <strong>{filteredApps.length}</strong>개의 앱
          </p>
          {activeTags.length > 0 && (
            <button
              className="reset-filters-button"
              onClick={() => startTransition(() => setActiveTags([]))}
              type="button"
            >
              태그 초기화
            </button>
          )}
        </div>

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
