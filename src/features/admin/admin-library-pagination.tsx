interface AdminLibraryPaginationProps {
  currentPage: number;
  onNext: () => void;
  onPrevious: () => void;
  totalPages: number;
}

export function AdminLibraryPagination({
  currentPage,
  onNext,
  onPrevious,
  totalPages
}: AdminLibraryPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="관리자 앱 목록 페이지" className="admin-library-pagination">
      <button
        className="admin-secondary-button"
        disabled={currentPage === 1}
        onClick={onPrevious}
        type="button"
      >
        이전
      </button>
      <span>
        {currentPage} / {totalPages}
      </span>
      <button
        className="admin-secondary-button"
        disabled={currentPage === totalPages}
        onClick={onNext}
        type="button"
      >
        다음
      </button>
    </nav>
  );
}
