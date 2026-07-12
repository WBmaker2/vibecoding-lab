"use client";

import Image from "next/image";
import { useState } from "react";
import { SearchBar } from "./search-bar";
import { TagFilterBar } from "./tag-filter-bar";
import { UpdateHistory } from "./update-history";

interface ArchiveHeroProps {
  activeTags: string[];
  onQueryChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  query: string;
  allTags: string[];
  representativeTags: string[];
}

export function ArchiveHero({
  activeTags,
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
  const activeTag = activeTags[0];
  const hasAdditionalTags = allTags.some((tag) => !representativeTagSet.has(tag));
  const collapsedTags =
    activeTag && !representativeTagSet.has(activeTag)
      ? [...collapsedRepresentativeTags.slice(0, -1), activeTag]
      : collapsedRepresentativeTags;
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
            교실 수업과 교사 업무를 가볍게 만드는 웹앱을 빠르게 찾고 바로 열 수
            있는 공개 아카이브입니다.
          </p>
        </div>

        <Image
          alt="태그 탐색을 안내하는 Hong 캐릭터"
          className="archive-hero-mascot-image"
          height={96}
          priority
          sizes="(max-width: 720px) 64px, 76px"
          src="/images/mascots/hong-default.png"
          unoptimized
          width={76}
        />
      </div>

      <SearchBar
        label="앱 검색"
        onQueryChange={onQueryChange}
        placeholder="예: 영어, 체육, 과학, 담임, 수업, 업무 등"
        query={query}
      />

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
