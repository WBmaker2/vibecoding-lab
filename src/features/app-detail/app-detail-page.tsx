import Link from "next/link";
import { createAppFaqItems } from "@/lib/apps/app-faq";
import { createAppPath } from "@/lib/apps/app-slug";
import { gradeBandsToLegacyText } from "@/lib/apps/metadata";
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

const AUDIENCE_LABELS = {
  student: "학생",
  teacher: "교사",
  mixed: "교사와 학생"
} as const;

const INTERACTION_LABELS = {
  simulation: "시뮬레이션",
  practice: "연습",
  collaboration: "협력",
  creation: "제작",
  management: "기록·관리",
  reference: "자료 탐색",
  utility: "변환·도구"
} as const;

function getAppFacts(app: PublicAppRecord) {
  const subject =
    app.subjects && app.subjects.length > 0
      ? app.subjects.join(" · ")
      : app.subject;
  const grade =
    app.grade ??
    (app.gradeBands ? gradeBandsToLegacyText(app.gradeBands) : undefined);

  return [
    { label: "대상", value: app.audience ? AUDIENCE_LABELS[app.audience] : undefined },
    { label: "학년", value: grade },
    { label: "교과", value: subject },
    {
      label: "활동 방식",
      value: app.interactionType
        ? INTERACTION_LABELS[app.interactionType]
        : undefined
    }
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
}

export function AppDetailPage({ app, relatedApps }: AppDetailPageProps) {
  const submeta = [app.subject, app.grade].filter(Boolean).join(" · ");
  const facts = getAppFacts(app);
  const faqItems = createAppFaqItems(app);

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

      {facts.length > 0 ? (
        <section
          aria-labelledby="app-facts-title"
          className={styles.factsSection}
        >
          <p className={styles.sectionEyebrow}>Quick Facts</p>
          <h2 id="app-facts-title">한눈에 보기</h2>
          <dl className={styles.factGrid}>
            {facts.map((fact) => (
              <div className={styles.fact} key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {app.learningProcess && app.learningProcess.length > 0 ? (
        <section
          aria-labelledby="app-process-title"
          className={styles.processSection}
        >
          <p className={styles.sectionEyebrow}>Activity Flow</p>
          <h2 id="app-process-title">이 앱으로 할 수 있는 일</h2>
          <ol className={styles.processList}>
            {app.learningProcess.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {app.memo ? (
        <section className={styles.noteSection}>
          <p className={styles.sectionEyebrow}>Hong&apos;s Note</p>
          <h2>수업과 업무에서 이렇게 활용해보세요</h2>
          <p>{app.memo}</p>
        </section>
      ) : null}

      {faqItems.length > 0 ? (
        <section aria-labelledby="app-faq-title" className={styles.faqSection}>
          <p className={styles.sectionEyebrow}>Answer Ready</p>
          <h2 id="app-faq-title">자주 묻는 질문</h2>
          <dl className={styles.faqList}>
            {faqItems.map((item) => (
              <div className={styles.faqItem} key={item.question}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
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
