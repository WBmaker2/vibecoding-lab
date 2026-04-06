import Image from "next/image";
import { SearchBar } from "./search-bar";
import { TagFilterBar } from "./tag-filter-bar";

interface ArchiveHeroProps {
  activeTags: string[];
  onQueryChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  query: string;
  tags: string[];
}

export function ArchiveHero({
  activeTags,
  onQueryChange,
  onToggleTag,
  query,
  tags
}: ArchiveHeroProps) {
  return (
    <section className="hero-frame archive-hero">
      <div className="archive-hero-top">
        <div className="archive-hero-copy">
          <p className="eyebrow">Minimal Archive for Classroom Apps</p>
          <h1>Hong&apos;s Vibe Coding Lab</h1>
          <p className="hero-copy">
            교실 수업과 교사 업무를 가볍게 만드는 웹앱을 빠르게 찾고 바로 열 수
            있는 공개 아카이브입니다.
          </p>
        </div>

        <div className="archive-hero-mascot">
          <div className="mascot-note-shell">
            <div className="mascot-note-header">
              <p className="mascot-note-label">Hong&apos;s Note</p>
              <Image
                alt=""
                aria-hidden="true"
                className="archive-hero-mascot-image archive-hero-mascot-image-inline"
                height={88}
                priority
                src="/images/mascots/hong-default.png"
                width={88}
              />
            </div>
            <p className="mascot-note">
              설명은 짧게, 검색과 대표 태그는 바로 보이게 두어 필요한 도구를
              곧장 찾을 수 있게 합니다.
            </p>
          </div>
          <Image
            alt="태그 탐색을 안내하는 Hong 캐릭터"
            className="archive-hero-mascot-image archive-hero-mascot-image-floating"
            height={132}
            priority
            src="/images/mascots/hong-default.png"
            width={132}
          />
        </div>
      </div>

      <SearchBar
        label="앱 검색"
        onQueryChange={onQueryChange}
        placeholder="예: 영어, 학급경영, 형성평가, 수업준비…"
        query={query}
      />

      <div className="archive-tag-group">
        <p className="tag-copy">대표 태그</p>
        <TagFilterBar
          activeTags={activeTags}
          onToggleTag={onToggleTag}
          tags={tags}
        />
      </div>
    </section>
  );
}
