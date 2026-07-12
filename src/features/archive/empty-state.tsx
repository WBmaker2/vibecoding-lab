import Image from "next/image";

interface EmptyStateProps {
  query: string;
}

export function EmptyState({ query }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-live="polite">
      <div className="empty-state-copy">
        <p className="eyebrow">No Matches</p>
        <h2>조건을 조금 바꾸면 더 잘 찾을 수 있습니다</h2>
        <p>
          {query
            ? `"${query}" 대신 더 짧은 검색어를 시도해 보세요.`
            : "대표 태그를 먼저 누르거나 검색어를 입력해 보세요."}
        </p>
      </div>
      <Image
        alt="검색 결과가 없을 때 안내하는 Hong 캐릭터"
        className="empty-state-mascot"
        height={240}
        priority
        src="/images/mascots/hong-default.png"
        unoptimized
        width={240}
      />
    </section>
  );
}
