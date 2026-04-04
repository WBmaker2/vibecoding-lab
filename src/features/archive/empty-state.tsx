import Image from "next/image";

interface EmptyStateProps {
  query: string;
}

export function EmptyState({ query }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-live="polite">
      <div className="empty-state-copy">
        <p className="eyebrow">No Matches</p>
        <h2>조건에 맞는 앱을 찾지 못했습니다</h2>
        <p>
          {query
            ? `"${query}" 대신 더 짧은 키워드나 다른 태그를 시도해 보세요.`
            : "검색어를 입력하거나 태그를 바꿔서 다시 살펴보세요."}
        </p>
      </div>
      <Image
        alt="검색 결과가 없을 때 안내하는 Hong 캐릭터"
        className="empty-state-mascot"
        height={240}
        priority
        src="/images/mascots/hong-default.png"
        width={240}
      />
    </section>
  );
}
