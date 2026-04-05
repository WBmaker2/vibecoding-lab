interface ArchiveResultsStateProps {
  activeTags: string[];
  onReset: () => void;
  query: string;
  resultCount: number;
}

function buildStateDetail(query: string, activeTags: string[]) {
  const states: string[] = [];

  if (activeTags.length > 0) {
    states.push(`${activeTags.map((tag) => `#${tag}`).join(", ")} 필터 적용`);
  }

  if (query.trim().length > 0) {
    states.push(`"${query.trim()}" 검색 적용`);
  }

  return states.join(" · ");
}

export function ArchiveResultsState({
  activeTags,
  onReset,
  query,
  resultCount
}: ArchiveResultsStateProps) {
  const detail = buildStateDetail(query, activeTags);
  const hasFilters = detail.length > 0;

  return (
    <section aria-live="polite" className="archive-results-state">
      <div className="archive-results-state-copy">
        <p className="archive-results-state-title">
          <strong>{resultCount}</strong>개의 앱
        </p>
        <p className="archive-results-state-detail">
          {hasFilters
            ? detail
            : "대표 태그를 누르거나 검색어를 입력해 원하는 앱을 빠르게 좁혀보세요."}
        </p>
      </div>

      {hasFilters ? (
        <button
          className="reset-filters-button"
          onClick={onReset}
          type="button"
        >
          필터 초기화
        </button>
      ) : null}
    </section>
  );
}
