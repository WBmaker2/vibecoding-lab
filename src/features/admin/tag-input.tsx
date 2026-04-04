"use client";

import { useState } from "react";

interface TagInputProps {
  initialTags?: string[];
  name: string;
}

export function TagInput({ initialTags = [], name }: TagInputProps) {
  const [tags, setTags] = useState(initialTags);
  const [draft, setDraft] = useState("");

  function commitTag(raw: string) {
    const next = raw.trim();

    if (!next || tags.includes(next)) {
      return;
    }

    setTags((current) => [...current, next]);
  }

  return (
    <div className="tag-input-shell">
      <input name={name} type="hidden" value={JSON.stringify(tags)} />

      <div className="tag-input-list">
        {tags.map((tag) => (
          <button
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
    </div>
  );
}
