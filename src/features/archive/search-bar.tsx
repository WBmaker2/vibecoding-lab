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
  placeholder = "예: 영어, 체육, 과학, 담임, 수업, 업무 등"
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
