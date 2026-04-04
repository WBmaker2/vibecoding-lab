"use client";

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export function SearchBar({ query, onQueryChange }: SearchBarProps) {
  return (
    <div className="archive-search-shell">
      <label className="sr-only" htmlFor="archive-search">
        앱 검색
      </label>
      <input
        aria-label="앱 검색"
        className="archive-search-input"
        id="archive-search"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="예: 학급경영, 영어, 형성평가, 수업준비"
        type="search"
        value={query}
      />
    </div>
  );
}
