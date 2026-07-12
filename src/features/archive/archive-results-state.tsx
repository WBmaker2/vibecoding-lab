interface ArchiveResultsStateProps {
  activeTags: string[];
  onReset: () => void;
  query: string;
  resultCount: number;
}

function buildActiveFilters(query: string, activeTags: string[]) {
  const trimmedQuery = query.trim();

  return [
    ...activeTags.map((tag) => ({
      id: `tag:${tag}`,
      label: `#${tag}`,
      type: "tag" as const
    })),
    ...(trimmedQuery.length > 0
      ? [
          {
            id: `query:${trimmedQuery}`,
            label: `검색어 "${trimmedQuery}"`,
            type: "query" as const
          }
        ]
      : [])
  ];
}

export function ArchiveResultsState({
  activeTags,
  onReset,
  query,
  resultCount
}: ArchiveResultsStateProps) {
  const activeFilters = buildActiveFilters(query, activeTags);
  const hasFilters = activeFilters.length > 0;

  return (
    <section aria-live="polite" className="archive-results-state">
      <div className="archive-results-state-copy">
        <p className="archive-results-state-title">
          <strong>{resultCount}</strong>개의 앱
        </p>
        <p className="archive-results-state-detail">
          {hasFilters
            ? "현재 적용된 필터를 한눈에 확인하고, 필요하면 한 번에 초기화할 수 있습니다."
            : "대표 태그를 누르거나 검색어를 입력해 원하는 앱을 빠르게 좁혀보세요."}
        </p>
      </div>

      {hasFilters ? (
        <div className="archive-results-active">
          <div
            aria-label="활성 필터"
            className="archive-results-filter-list"
            role="list"
          >
            {activeFilters.map((filter) => (
              <span
                className={
                  filter.type === "query"
                    ? "archive-state-chip is-query"
                    : "archive-state-chip"
                }
                key={filter.id}
                role="listitem"
              >
                {filter.label}
              </span>
            ))}
          </div>

          <button
            className="reset-filters-button"
            onClick={onReset}
            type="button"
          >
            필터 초기화
          </button>
        </div>
      ) : null}
    </section>
  );
}
