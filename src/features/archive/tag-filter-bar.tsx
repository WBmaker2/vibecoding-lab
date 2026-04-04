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
    <div className="tag-filter-bar" role="toolbar" aria-label="태그 필터">
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
