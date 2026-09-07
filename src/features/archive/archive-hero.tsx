"use client";

import Image from "next/image";
import { useState } from "react";
import { SearchBar } from "./search-bar";
import { TagFilterBar } from "./tag-filter-bar";
import { UpdateHistory } from "./update-history";
import {
  ArchiveCollections,
  type ArchiveCollectionPreset
} from "./archive-collections";

interface ArchiveHeroProps {
  activeFilterCount?: number;
  activeCollectionId?: string | null;
  activeTags: string[];
  onSelectCollection?: (collection: ArchiveCollectionPreset) => void;
  onOpenFilters?: () => void;
  onQueryChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  query: string;
  allTags: string[];
  representativeTags: string[];
}

export function ArchiveHero({
  activeFilterCount = 0,
  activeCollectionId = null,
  activeTags,
  onSelectCollection,
  onOpenFilters,
  onQueryChange,
  onToggleTag,
  query,
  allTags,
  representativeTags
}: ArchiveHeroProps) {
  const [isAllTagsOpen, setIsAllTagsOpen] = useState(false);
  const tagPanelId = "archive-tag-panel";
  const representativeTagSet = new Set(representativeTags);
  const collapsedRepresentativeTags = representativeTags.slice(0, 10);
  const hasAdditionalTags = allTags.some((tag) => !representativeTagSet.has(tag));
  const hiddenActiveTags = activeTags.filter(
    (tag) => !representativeTagSet.has(tag)
  );
  const representativeSlotCount = Math.max(0, 10 - hiddenActiveTags.length);
  const collapsedTags = [
    ...collapsedRepresentativeTags.slice(0, representativeSlotCount),
    ...hiddenActiveTags
  ];
  const visibleTags = isAllTagsOpen ? allTags : collapsedTags;

  return (
    <section className="archive-hero">
      <div className="archive-hero-top">
        <div className="archive-hero-copy">
          <div className="archive-hero-utility">
            <p className="eyebrow">Minimal Archive for Classroom Apps</p>
            <UpdateHistory />
          </div>
          <h1>Hong&apos;s Vibe Coding Lab</h1>
          <p className="hero-copy">
            바이브홍이 만든 교실 수업·교사 업무용 웹앱 아카이브입니다.
          </p>
        </div>

        <Image
          alt="태그 탐색을 안내하는 Hong 캐릭터"
          className="archive-hero-mascot-image"
          height={2304}
          priority
          sizes="(max-width: 720px) 128px, 184px"
          src="/images/mascots/hong-default.png"
          unoptimized
          width={1856}
        />
      </div>

      <SearchBar
        label="앱 검색"
        onQueryChange={onQueryChange}
        placeholder="예: 과학 5학년, 영어 단어, 담임 업무"
        query={query}
      />

      {onSelectCollection ? (
        <ArchiveCollections
          activeId={activeCollectionId}
          onSelect={onSelectCollection}
        />
      ) : null}

      {onOpenFilters ? (
        <button
          aria-label="분류 필터 열기"
          className="archive-mobile-filter-button gi-pulse"
          onClick={onOpenFilters}
          type="button"
        >
          필터 {activeFilterCount > 0 ? activeFilterCount : ""}
        </button>
      ) : null}

      <div className="archive-tag-group">
        <div className="tag-copy-row">
          <div className="tag-copy-text">
            <p className="tag-copy">대표 태그</p>
            <p className="tag-copy-hint">
              태그를 하나씩 클릭해 원하는 앱을 알아보세요.
            </p>
          </div>
        </div>
        <div id={tagPanelId}>
          <TagFilterBar
            activeTags={activeTags}
            onToggleTag={onToggleTag}
            tags={visibleTags}
          />
        </div>
        {hasAdditionalTags ? (
          <button
            aria-controls={tagPanelId}
            aria-expanded={isAllTagsOpen}
            className="tag-panel-toggle"
            onClick={() => setIsAllTagsOpen((current) => !current)}
            type="button"
          >
            {isAllTagsOpen ? "모든 태그 접기" : "모든 태그 보기"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
