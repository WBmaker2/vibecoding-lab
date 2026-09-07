"use client";

export type AdminListStatus = "all" | "pending" | "synced";
export type AdminListSort = "updated" | "title" | "created";

interface AdminLibraryControlsProps {
  onQueryChange: (value: string) => void;
  onSortChange: (value: AdminListSort) => void;
  onStatusChange: (value: AdminListStatus) => void;
  onSubjectChange: (value: string) => void;
  query: string;
  sort: AdminListSort;
  status: AdminListStatus;
  subject: string;
  subjects: string[];
  pendingCount: number;
  resultCount: number;
}
export function AdminLibraryControls({
  onQueryChange,
  onSortChange,
  onStatusChange,
  onSubjectChange,
  query,
  sort,
  status,
  subject,
  subjects,
  pendingCount,
  resultCount
}: AdminLibraryControlsProps) {
  return (
    <div className="admin-library-controls" aria-label="등록 앱 필터">
      <label className="admin-library-search">
        <span>앱 검색</span>
        <input
          aria-label="등록된 앱 검색"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="제목, 설명, 태그, URL 검색"
          type="search"
          value={query}
        />
      </label>
      <label className="admin-library-select">
        <span>과목</span>
        <select
          aria-label="등록 앱 과목 필터"
          onChange={(event) => onSubjectChange(event.target.value)}
          value={subject}
        >
          <option value="all">전체 과목</option>
          {subjects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-library-select">
        <span>반영 상태</span>
        <select
          aria-label="등록 앱 반영 상태 필터"
          onChange={(event) => onStatusChange(event.target.value as AdminListStatus)}
          value={status}
        >
          <option value="all">전체 ({resultCount})</option>
          <option value="pending">공개 반영 대기 ({pendingCount})</option>
          <option value="synced">공개 반영 완료</option>
        </select>
      </label>
      <label className="admin-library-select">
        <span>정렬</span>
        <select
          aria-label="등록 앱 정렬"
          onChange={(event) => onSortChange(event.target.value as AdminListSort)}
          value={sort}
        >
          <option value="updated">최근 수정순</option>
          <option value="title">가나다순</option>
          <option value="created">최근 등록순</option>
        </select>
      </label>
    </div>
  );
}
