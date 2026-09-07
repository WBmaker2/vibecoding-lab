"use client";

import { useMemo, useState } from "react";
import { normalizeTag, normalizeTags } from "@/lib/apps/tags";

interface TagInputProps {
  inputLabelledBy?: string;
  initialTags?: string[];
  name: string;
  onTagsChange?: (tags: string[]) => void;
  suggestedTags?: string[];
}

export function TagInput({
  inputLabelledBy,
  initialTags = [],
  name,
  onTagsChange,
  suggestedTags = []
}: TagInputProps) {
  const [tags, setTags] = useState(() => normalizeTags(initialTags));
  const [draft, setDraft] = useState("");
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  function commitTag(raw: string) {
    const next = normalizeTag(raw);

    if (!next) {
      return;
    }

    setTags((current) => {
      const nextTags = current.includes(next) ? current : [...current, next];
      if (nextTags !== current) onTagsChange?.(nextTags);
      return nextTags;
    });
  }

  function removeTagAt(indexToRemove: number) {
    setTags((current) => {
      const nextTags = current.filter((_, index) => index !== indexToRemove);
      onTagsChange?.(nextTags);
      return nextTags;
    });
  }

  const uniqueSuggestedTags = normalizeTags(suggestedTags);
  const visibleSuggestedTags = useMemo(() => {
    const normalizedQuery = suggestionQuery.trim().toLocaleLowerCase("ko");
    const filtered = normalizedQuery
      ? uniqueSuggestedTags.filter((tag) =>
          tag.toLocaleLowerCase("ko").includes(normalizedQuery)
        )
      : uniqueSuggestedTags;

    return showAllSuggestions || normalizedQuery
      ? filtered
      : filtered.slice(0, 12);
  }, [showAllSuggestions, suggestionQuery, uniqueSuggestedTags]);

  return (
    <div className="tag-input-shell">
      <input name={name} type="hidden" value={JSON.stringify(tags)} />

      <div className="tag-input-list">
        {tags.map((tag, index) => (
          <button
            aria-label={`#${tag} 제거`}
            className="tag-pill"
            key={`${tag}-${index}`}
            onClick={() => removeTagAt(index)}
            type="button"
          >
            #{tag}
          </button>
        ))}
      </div>

      <input
        aria-label={inputLabelledBy ? undefined : "태그 입력"}
        aria-labelledby={inputLabelledBy}
        className="admin-tag-input"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commitTag(draft);
            setDraft("");
            return;
          }

          if (event.key === "Backspace" && draft === "" && tags.length > 0) {
            setTags((current) => {
              const nextTags = current.slice(0, -1);
              onTagsChange?.(nextTags);
              return nextTags;
            });
          }
        }}
        placeholder="엔터 또는 쉼표로 태그 추가"
        type="text"
        value={draft}
      />

      {uniqueSuggestedTags.length > 0 && (
        <div className="tag-suggestion-shell">
          <div className="tag-suggestion-header">
            <p className="tag-suggestion-label">기존 태그</p>
            <span>{uniqueSuggestedTags.length}개</span>
          </div>
          {uniqueSuggestedTags.length > 6 ? (
            <input
              aria-label="기존 태그 검색"
              className="admin-tag-suggestion-search"
              onChange={(event) => setSuggestionQuery(event.target.value)}
              placeholder="기존 태그 이름으로 찾기"
              type="search"
              value={suggestionQuery}
            />
          ) : null}
          <div className="tag-suggestion-list">
            {visibleSuggestedTags.map((tag) => {
              const isSelected = tags.includes(tag);

              return (
                <button
                  aria-label={
                    isSelected ? `#${tag} 이미 선택됨` : `#${tag} 추가`
                  }
                  className={
                    isSelected
                      ? "tag-pill tag-suggestion-pill is-disabled"
                      : "tag-pill tag-suggestion-pill"
                  }
                  disabled={isSelected}
                  key={tag}
                  onClick={() => commitTag(tag)}
                  type="button"
                >
                  #{tag}
                </button>
              );
            })}
          </div>
          {!suggestionQuery && uniqueSuggestedTags.length > 12 ? (
            <button
              className="admin-tag-suggestion-toggle"
              onClick={() => setShowAllSuggestions((current) => !current)}
              type="button"
            >
              {showAllSuggestions ? "태그 추천 줄이기" : "모든 태그 보기"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
