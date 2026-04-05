"use client";

interface SearchBarProps {
  label?: string;
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  label = "앱 검색",
  query,
  onQueryChange,
  placeholder = "예: 학급경영, 영어, 형성평가, 수업준비…"
}: SearchBarProps) {
  return (
    <div className="archive-search-shell">
      <label className="archive-search-label" htmlFor="archive-search">
        {label}
      </label>
      <input
        aria-label="앱 검색"
        autoComplete="off"
        className="archive-search-input"
        id="archive-search"
        name="query"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={query}
      />
    </div>
  );
}
