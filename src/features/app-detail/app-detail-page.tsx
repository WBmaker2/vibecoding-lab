import Link from "next/link";
import { createAppPath } from "@/lib/apps/app-slug";
import type { PublicAppRecord } from "@/lib/apps/types";
import { UpdateHistory } from "@/features/archive/update-history";
import styles from "./app-detail-page.module.css";

interface AppDetailPageProps {
  app: PublicAppRecord;
  relatedApps: PublicAppRecord[];
}

function formatUpdatedAt(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

export function AppDetailPage({ app, relatedApps }: AppDetailPageProps) {
  const submeta = [app.subject, app.grade].filter(Boolean).join(" · ");

  return (
    <main className={styles.page}>
      <div className={styles.utilityBar}>
        <Link className={styles.backLink} href="/">
          앱 아카이브로 돌아가기
        </Link>
        <UpdateHistory />
      </div>

      <article className={styles.hero}>
        <div className={styles.mediaColumn}>
          <div className={styles.mediaFrame}>
            {app.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`${app.title} 미리보기`}
                className={styles.thumbnail}
                decoding="async"
                referrerPolicy="no-referrer"
                src={app.thumbnailUrl}
              />
            ) : (
              <div className={styles.placeholder}>{app.subject ?? "교사용 웹앱"}</div>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <p className={styles.eyebrow}>Classroom App Archive</p>
          <h1 className={styles.title}>{app.title}</h1>
          <p className={styles.summary}>{app.summary}</p>
          {submeta ? <p className={styles.submeta}>{submeta}</p> : null}

          <ul aria-label={`${app.title} 전체 태그`} className={styles.tags}>
            {app.tags.map((tag) => (
              <li className={styles.tag} key={tag}>
                #{tag}
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <a
              aria-label={`${app.title} 앱 열기`}
              className={styles.primaryLink}
              href={app.url}
              rel="noreferrer"
              target="_blank"
            >
              앱 열기
            </a>
            <Link className={styles.secondaryLink} href="/">
              다른 앱 찾아보기
            </Link>
          </div>
        </div>
      </article>

      {app.memo ? (
        <section className={styles.noteSection}>
          <p className={styles.sectionEyebrow}>Hong&apos;s Note</p>
          <h2>수업과 업무에서 이렇게 활용해보세요</h2>
          <p>{app.memo}</p>
        </section>
      ) : null}

      {relatedApps.length > 0 ? (
        <section className={styles.relatedSection}>
          <div className={styles.relatedHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Related Apps</p>
              <h2>함께 살펴볼 앱</h2>
            </div>
            <p>태그와 교과가 비슷한 도구를 정적 아카이브에서 골랐습니다.</p>
          </div>
          <div className={styles.relatedGrid}>
            {relatedApps.map((relatedApp) => (
              <article className={styles.relatedCard} key={relatedApp.id}>
                <h3>
                  <Link
                    className={styles.relatedLink}
                    href={createAppPath(relatedApp)}
                  >
                    {relatedApp.title}
                  </Link>
                </h3>
                <p>{relatedApp.summary}</p>
                <p className={styles.relatedTags}>
                  {relatedApp.tags.slice(0, 3).map((tag) => `#${tag}`).join(" ")}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer className={styles.footer}>
        <span>Hong&apos;s Vibe Coding Lab</span>
        <time dateTime={app.updatedAt.toISOString()}>
          최근 정보 수정 {formatUpdatedAt(app.updatedAt)}
        </time>
      </footer>
    </main>
  );
}
