import type { PublicAppRecord } from "@/lib/apps/types";

interface AppCardProps {
  app: PublicAppRecord;
}

export function AppCard({ app }: AppCardProps) {
  const submeta = [app.subject, app.grade].filter(Boolean).join(" · ");
  const note = app.memo ?? "";
  const notePreview =
    note.length > 42 ? `${note.slice(0, 42).trimEnd()}…` : note;

  return (
    <article className="app-card">
      <div className="app-card-media">
        <div className="app-card-media-inner">
          {app.thumbnailUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${app.title} 썸네일`}
                className="app-card-thumbnail"
                decoding="async"
                loading="lazy"
                referrerPolicy="no-referrer"
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

        {submeta ? <p className="app-card-submeta">{submeta}</p> : null}

        {note && (
          <details className="app-card-note">
            <summary>
              <span>메이커 노트</span>
              <span className="app-card-note-preview">{notePreview}</span>
            </summary>
            <p>{note}</p>
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
