"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type {
  AppAudience,
  AppInteractionType,
  GradeBand
} from "@/lib/apps/metadata";
import type { PublicAppRecord } from "@/lib/apps/types";
import {
  filterApps,
  sortApps,
  type AppSort
} from "@/lib/search/filter-apps";
import { getRepresentativeTags } from "@/lib/apps/representative-tags";
import { AppCard } from "./app-card";
import {
  type ArchiveCollectionPreset
} from "./archive-collections";
import { ArchiveFilterPanel } from "./archive-filter-panel";
import {
  AUDIENCE_LABELS,
  GRADE_BAND_LABELS,
  getArchiveFilterOptions,
  INTERACTION_LABELS
} from "./archive-filter-options";
import { ArchiveHero } from "./archive-hero";
import { ArchivePagination } from "./archive-pagination";
import { ArchiveResultsState } from "./archive-results-state";
import { EmptyState } from "./empty-state";
import {
  readArchiveUrlState,
  toggleValue,
  writeArchiveUrlState
} from "./archive-url-state";
import { useArchiveLocalHistory } from "./use-archive-local-history";

const PAGE_SIZE = 24;

interface ArchivePageProps {
  initialApps: PublicAppRecord[];
}

const SORT_LABELS: Record<AppSort, string> = {
  relevance: "관련도",
  updated: "최근 수정",
  title: "가나다순",
  created: "최근 등록"
};

export function ArchivePage({ initialApps }: ArchivePageProps) {
  const options = useMemo(() => getArchiveFilterOptions(initialApps), [initialApps]);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [gradeBands, setGradeBands] = useState<GradeBand[]>([]);
  const [audience, setAudience] = useState<AppAudience | "all">("all");
  const [interactionTypes, setInteractionTypes] = useState<AppInteractionType[]>([]);
  const [sort, setSort] = useState<AppSort>("relevance");
  const [page, setPage] = useState(1);
  const [showRecent, setShowRecent] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isUrlReady, setIsUrlReady] = useState(false);
  const hasInteractedRef = useRef(false);
  const appIds = useMemo(() => initialApps.map((app) => app.id), [initialApps]);
  const {
    clearFavorites: clearStoredFavorites,
    clearRecent: clearStoredRecent,
    favoriteIds,
    recentIds,
    recordRecent,
    toggleFavorite
  } = useArchiveLocalHistory(appIds);

  const availableTags = useMemo(
    () =>
      [...new Set(initialApps.flatMap((app) => app.tags))].sort((left, right) =>
        left.localeCompare(right, "ko")
      ),
    [initialApps]
  );
  const representativeTags = useMemo(
    () => getRepresentativeTags(initialApps),
    [initialApps]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hasInteractedRef.current) return;
      const state = readArchiveUrlState(window.location.search, options);
      setQuery(state.query);
      setActiveTags(state.activeTags);
      setSelectedSubjects(state.selectedSubjects);
      setGradeBands(state.gradeBands);
      setAudience(state.audience);
      setInteractionTypes(state.interactionTypes);
      setSort(state.sort);
      setPage(state.page);
      setShowRecent(state.recentOnly);
      setShowFavorites(state.savedOnly);
      setIsUrlReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [options]);

  const filteredApps = useMemo(
    () =>
      sortApps(
        filterApps(initialApps, query, activeTags, {
          audience,
          gradeBands,
          interactionTypes,
          subjects: selectedSubjects
        })
          .filter((app) => !showFavorites || favoriteIds.includes(app.id))
          .filter((app) => !showRecent || recentIds.includes(app.id)),
        sort,
        query
      ),
    [
      activeTags,
      audience,
      favoriteIds,
      gradeBands,
      initialApps,
      interactionTypes,
      query,
      recentIds,
      selectedSubjects,
      showFavorites,
      showRecent,
      sort
    ]
  );

  const totalPages = Math.max(1, Math.ceil(filteredApps.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleApps = filteredApps.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const returnSearch = writeArchiveUrlState({
    activeTags,
    audience,
    gradeBands,
    interactionTypes,
    page: safePage,
    query,
    recentOnly: showRecent,
    savedOnly: showFavorites,
    selectedSubjects,
    sort
  });
  const selectedFilterCount =
    activeTags.length +
    selectedSubjects.length +
    gradeBands.length +
    interactionTypes.length +
    (audience === "all" ? 0 : 1);
  const activeStructuredFilters = [
    ...selectedSubjects.map((value) => ({ id: `subject:${value}`, label: `교과 ${value}` })),
    ...gradeBands.map((value) => ({ id: `grade:${value}`, label: GRADE_BAND_LABELS[value] })),
    ...(audience !== "all"
      ? [{ id: `audience:${audience}`, label: AUDIENCE_LABELS[audience] }]
      : []),
    ...interactionTypes.map((value) => ({
      id: `interaction:${value}`,
      label: INTERACTION_LABELS[value]
    })),
    ...(showFavorites
      ? [{ id: "saved", label: `내 보관함 ${favoriteIds.length}개` }]
      : []),
    ...(showRecent
      ? [{ id: "recent", label: `최근 사용 ${recentIds.length}개` }]
      : [])
  ];

  useEffect(() => {
    if (!isUrlReady) return;
    const nextSearch = writeArchiveUrlState({
      activeTags,
      audience,
      gradeBands,
      interactionTypes,
      page: safePage,
      query,
      recentOnly: showRecent,
      savedOnly: showFavorites,
      selectedSubjects,
      sort
    });
    const nextUrl = `${window.location.pathname}${nextSearch}`;
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [activeTags, audience, gradeBands, interactionTypes, isUrlReady, page, query, recentIds, safePage, selectedSubjects, showFavorites, showRecent, sort]);

  function markInteracted() {
    hasInteractedRef.current = true;
    setIsUrlReady(true);
  }

  function resetFilters() {
    markInteracted();
    startTransition(() => {
      setActiveTags([]);
      setQuery("");
      setSelectedSubjects([]);
      setGradeBands([]);
      setAudience("all");
      setInteractionTypes([]);
      setSort("relevance");
      setPage(1);
      setShowRecent(false);
      setShowFavorites(false);
      setActiveCollectionId(null);
      setIsMobileFiltersOpen(false);
    });
  }

  function updateQuery(value: string) {
    markInteracted();
    setActiveCollectionId(null);
    setQuery(value);
    setPage(1);
  }

  function toggleTag(tag: string) {
    markInteracted();
    setActiveCollectionId(null);
    setActiveTags((current) => toggleValue(current, tag));
    setPage(1);
  }

  function changeAudience(value: AppAudience | "all") {
    markInteracted();
    setActiveCollectionId(null);
    setAudience(value);
    setPage(1);
  }

  function changeSort(value: AppSort) {
    markInteracted();
    setActiveCollectionId(null);
    setSort(value);
    setPage(1);
  }

  function selectCollection(collection: ArchiveCollectionPreset) {
    markInteracted();
    setActiveCollectionId(collection.id);
    setQuery("");
    setActiveTags([]);
    setSelectedSubjects(collection.subjects ?? []);
    setGradeBands(collection.gradeBands ?? []);
    setAudience(collection.audience ?? "all");
    setInteractionTypes(collection.interactionTypes ?? []);
    setShowRecent(false);
    setShowFavorites(false);
    setSort("relevance");
    setPage(1);
  }

  function toggleFavoritesView() {
    markInteracted();
    setActiveCollectionId(null);
    setShowRecent(false);
    setShowFavorites((current) => !current);
    setPage(1);
  }

  function toggleRecentView() {
    markInteracted();
    setActiveCollectionId(null);
    setShowFavorites(false);
    setShowRecent((current) => !current);
    setPage(1);
  }

  function clearFavoritesView() {
    if (favoriteIds.length === 0) return;
    if (!window.confirm("내 보관함에 저장한 앱을 모두 비울까요?")) return;
    clearStoredFavorites();
  }

  function clearRecentView() {
    if (recentIds.length === 0) return;
    if (!window.confirm("최근 사용 목록을 모두 비울까요?")) return;
    clearStoredRecent();
  }

  function changePage(value: number) {
    markInteracted();
    setPage(value);
  }

  return (
    <main className="page-shell archive-page">
      <ArchiveHero
        activeCollectionId={activeCollectionId}
        activeFilterCount={selectedFilterCount}
        activeTags={activeTags}
        onOpenFilters={() => setIsMobileFiltersOpen(true)}
        onSelectCollection={selectCollection}
        onQueryChange={updateQuery}
        onToggleTag={toggleTag}
        query={query}
        allTags={availableTags}
        representativeTags={representativeTags}
      />

      <div className="archive-browse-layout">
        <ArchiveFilterPanel
          audience={audience}
          gradeBands={gradeBands}
          interactionTypes={interactionTypes}
          isOpen={isMobileFiltersOpen}
          onAudienceChange={changeAudience}
          onClose={() => setIsMobileFiltersOpen(false)}
          onGradeBandToggle={(value) => {
            markInteracted();
            setActiveCollectionId(null);
            setGradeBands((current) => toggleValue(current, value));
            setPage(1);
          }}
          onInteractionTypeToggle={(value) => {
            markInteracted();
            setActiveCollectionId(null);
            setInteractionTypes((current) => toggleValue(current, value));
            setPage(1);
          }}
          onReset={resetFilters}
          onSubjectToggle={(value) => {
            markInteracted();
            setActiveCollectionId(null);
            setSelectedSubjects((current) => toggleValue(current, value));
            setPage(1);
          }}
          selectedSubjects={selectedSubjects}
          options={options}
        />

        <section className="archive-results">
          <div className="archive-results-toolbar">
            <ArchiveResultsState
              activeTags={activeTags}
              additionalFilters={activeStructuredFilters}
              onReset={resetFilters}
              query={query}
              resultCount={filteredApps.length}
              sortLabel={SORT_LABELS[sort]}
              totalCount={initialApps.length}
            />
            <div className="archive-results-toolbar-actions">
              <button
                aria-pressed={showFavorites}
                className={`archive-saved-toggle${showFavorites ? " is-active" : ""}`}
                onClick={toggleFavoritesView}
                type="button"
              >
                내 보관함 {favoriteIds.length > 0 ? favoriteIds.length : ""}
              </button>
              {showFavorites ? (
                <span className="archive-saved-hint">이 기기에만 저장</span>
              ) : null}
              {showFavorites && favoriteIds.length > 0 ? (
                <button
                  className="archive-saved-clear"
                  onClick={clearFavoritesView}
                  type="button"
                >
                  전체 비우기
                </button>
              ) : null}
              <button
                aria-pressed={showRecent}
                className={`archive-saved-toggle${showRecent ? " is-active" : ""}`}
                onClick={toggleRecentView}
                type="button"
              >
                최근 사용 {recentIds.length > 0 ? recentIds.length : ""}
              </button>
              {showRecent ? (
                <span className="archive-saved-hint">이 기기에만 저장</span>
              ) : null}
              {showRecent && recentIds.length > 0 ? (
                <button
                  className="archive-saved-clear"
                  onClick={clearRecentView}
                  type="button"
                >
                  전체 비우기
                </button>
              ) : null}
              <label className="archive-sort-control">
                <span>정렬</span>
                <select
                  aria-label="앱 정렬"
                  onChange={(event) => changeSort(event.target.value as AppSort)}
                  value={sort}
                >
                  <option value="relevance">관련도</option>
                  <option value="updated">최근 수정</option>
                  <option value="title">가나다순</option>
                  <option value="created">최근 등록</option>
                </select>
              </label>
            </div>
          </div>

          {visibleApps.length > 0 ? (
            <div className="app-grid">
              {visibleApps.map((app) => (
                <AppCard
                  app={app}
                  isFavorite={favoriteIds.includes(app.id)}
                  key={app.id}
                  onRecordUse={recordRecent}
                  onToggleFavorite={toggleFavorite}
                  returnSearch={returnSearch}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              favoritesView={showFavorites}
              hasFilters={selectedFilterCount > 0}
              query={query}
              recentView={showRecent}
            />
          )}

          <ArchivePagination
            currentPage={safePage}
            onPageChange={changePage}
            totalPages={totalPages}
          />
        </section>
      </div>
    </main>
  );
}
