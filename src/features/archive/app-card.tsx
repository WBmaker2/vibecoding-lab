import Image from "next/image";
import type { AppRecord } from "@/lib/apps/types";

interface AppCardProps {
  app: AppRecord;
}

export function AppCard({ app }: AppCardProps) {
  return (
    <article className="app-card">
      <div className="app-card-media">
        <div className="app-card-media-inner">
          {app.thumbnailUrl && (
            <>
              <Image
                alt={`${app.title} 썸네일`}
                className="app-card-thumbnail"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                src={app.thumbnailUrl}
              />
              <div className="app-card-media-scrim" />
            </>
          )}

          <span className="app-card-media-label">
            {app.subject ?? "교사용 앱"}
          </span>
        </div>
      </div>

      <div className="app-card-body">
        <div className="app-card-header">
          <h2>{app.title}</h2>
          <p>{app.summary}</p>
        </div>

        <div className="app-card-tags" aria-label={`${app.title} 태그`}>
          {app.tags.map((tag) => (
            <span className="tag-chip tag-chip-static" key={tag}>
              #{tag}
            </span>
          ))}
        </div>

        {(app.subject || app.grade) && (
          <dl className="app-card-meta">
            {app.subject && (
              <div>
                <dt>과목</dt>
                <dd>{app.subject}</dd>
              </div>
            )}
            {app.grade && (
              <div>
                <dt>학년</dt>
                <dd>{app.grade}</dd>
              </div>
            )}
          </dl>
        )}

        {app.memo && (
          <details className="app-card-note">
            <summary>메이커 노트 보기</summary>
            <p>{app.memo}</p>
          </details>
        )}

        <a
          className="app-card-link"
          href={app.url}
          rel="noreferrer"
          target="_blank"
        >
          앱 열기
        </a>
      </div>
    </article>
  );
}
