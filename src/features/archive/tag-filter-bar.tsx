"use client";

interface TagFilterBarProps {
  tags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

export function TagFilterBar({
  tags,
  activeTags,
  onToggleTag
}: TagFilterBarProps) {
  return (
    <div
      aria-label="태그 필터"
      aria-orientation="horizontal"
      className="tag-filter-bar"
      role="toolbar"
    >
      {tags.map((tag) => {
        const active = activeTags.includes(tag);

        return (
          <button
            aria-pressed={active}
            className={active ? "tag-chip is-active" : "tag-chip"}
            key={tag}
            onClick={() => onToggleTag(tag)}
            type="button"
          >
            #{tag}
          </button>
        );
      })}
    </div>
  );
}
