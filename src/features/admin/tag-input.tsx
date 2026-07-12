"use client";

import { useState } from "react";
import { normalizeTag, normalizeTags } from "@/lib/apps/tags";

interface TagInputProps {
  inputLabelledBy?: string;
  initialTags?: string[];
  name: string;
  suggestedTags?: string[];
}

export function TagInput({
  inputLabelledBy,
  initialTags = [],
  name,
  suggestedTags = []
}: TagInputProps) {
  const [tags, setTags] = useState(() => normalizeTags(initialTags));
  const [draft, setDraft] = useState("");

  function commitTag(raw: string) {
    const next = normalizeTag(raw);

    if (!next) {
      return;
    }

    setTags((current) =>
      current.includes(next) ? current : [...current, next]
    );
  }

  function removeTagAt(indexToRemove: number) {
    setTags((current) =>
      current.filter((_, index) => index !== indexToRemove)
    );
  }

  const uniqueSuggestedTags = normalizeTags(suggestedTags);

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
            setTags((current) => current.slice(0, -1));
          }
        }}
        placeholder="엔터 또는 쉼표로 태그 추가"
        type="text"
        value={draft}
      />

      {uniqueSuggestedTags.length > 0 && (
        <div className="tag-suggestion-shell">
          <p className="tag-suggestion-label">기존 태그</p>
          <div className="tag-suggestion-list">
            {uniqueSuggestedTags.map((tag) => {
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
        </div>
      )}
    </div>
  );
}
