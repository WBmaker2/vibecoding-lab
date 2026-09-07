"use client";

interface ArchivePaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}
export function ArchivePagination({
  currentPage,
  onPageChange,
  totalPages
}: ArchivePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <nav aria-label="앱 목록 페이지" className="archive-pagination">
      <button
        className="archive-pagination-button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        이전
      </button>
      <div className="archive-pagination-pages">
        {pages.map((page) => (
          <button
            aria-current={page === currentPage ? "page" : undefined}
            aria-label={`${page}페이지`}
            className={`archive-pagination-button${page === currentPage ? " is-current" : ""}`}
            key={page}
            onClick={() => onPageChange(page)}
            type="button"
          >
            {page}
          </button>
        ))}
      </div>
      <button
        className="archive-pagination-button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        다음
      </button>
    </nav>
  );
}
