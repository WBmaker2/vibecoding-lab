"use client";

import { useState } from "react";
import { normalizeTag, normalizeTags } from "@/lib/apps/tags";

interface TagInputProps {
  initialTags?: string[];
  name: string;
  suggestedTags?: string[];
}

export function TagInput({
  initialTags = [],
  name,
  suggestedTags = []
}: TagInputProps) {
  const [tags, setTags] = useState(() => normalizeTags(initialTags));
  const [draft, setDraft] = useState("");

  function commitTag(raw: string) {
    const next = normalizeTag(raw);

    if (!next || tags.includes(next)) {
      return;
    }

    setTags((current) => [...current, next]);
  }

  const uniqueSuggestedTags = normalizeTags(suggestedTags);

  return (
    <div className="tag-input-shell">
      <input name={name} type="hidden" value={JSON.stringify(tags)} />

      <div className="tag-input-list">
        {tags.map((tag) => (
          <button
            aria-label={`#${tag} 제거`}
            className="tag-pill"
            key={tag}
            onClick={() =>
              setTags((current) => current.filter((item) => item !== tag))
            }
            type="button"
          >
            #{tag}
          </button>
        ))}
      </div>

      <input
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
