import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import type { AdminAppRecord } from "@/lib/apps/types";
import type { StaticGalleryBaseline } from "@/lib/apps/static-gallery-sync-state";

interface AdminDatabaseFallbackProps {
  apps: AdminAppRecord[];
  baseline: StaticGalleryBaseline;
  reason: string;
}

function formatSnapshotDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "알 수 없음"
    : date.toLocaleDateString("ko-KR");
}

export function AdminDatabaseFallback({
  apps,
  baseline,
  reason
}: AdminDatabaseFallbackProps) {
  const totalTags = new Set(apps.flatMap((app) => app.tags)).size;

  return (
    <main className="page-shell admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Private Admin</p>
          <h1>관리자 작업실</h1>
          <p className="admin-header-copy">
            현재 관리자 DB를 읽을 수 없어 공개 정적 스냅샷을 읽기 전용으로
            보여드립니다.
          </p>
        </div>

        <div className="admin-utility-actions">
          <div className="admin-header-stats" aria-label="관리자 현황">
            <span className="admin-stat-pill">{apps.length}개 앱</span>
            <span className="admin-stat-pill">{totalTags}개 태그</span>
          </div>

          <div className="admin-header-actions">
            <Link className="admin-secondary-button" href="/">
              공개 아카이브
            </Link>
            <form action={logoutAction}>
              <button className="admin-secondary-button" type="submit">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="admin-panel admin-db-fallback-panel" role="alert">
        <p className="eyebrow">Database Limit</p>
        <h2>DB 한도 초과로 임시 보호 화면을 표시합니다</h2>
        <p>{reason}</p>
        <p>
          새 앱 등록, 수정, 삭제는 DB 한도가 복구된 뒤 다시 가능합니다. 현재
          화면에서는 마지막으로 동기화된 공개 앱 목록만 확인하실 수 있습니다.
        </p>
        <dl className="admin-db-fallback-facts">
          <div>
            <dt>표시 데이터</dt>
            <dd>공개 정적 스냅샷</dd>
          </div>
          <div>
            <dt>마지막 스냅샷</dt>
            <dd>{formatSnapshotDate(baseline.generatedAt)}</dd>
          </div>
          <div>
            <dt>스냅샷 앱 수</dt>
            <dd>{baseline.appCount}개</dd>
          </div>
        </dl>
      </section>

      <section className="admin-panel admin-library-panel">
        <div className="admin-panel-header">
          <h2>읽기 전용 앱 라이브러리</h2>
          <p>
            DB가 복구될 때까지 공개 화면에 반영된 앱 목록을 확인하는 용도로만
            사용해 주세요.
          </p>
        </div>

        <div className="admin-app-list">
          {apps.map((app) => (
            <article className="admin-app-card" key={app.id}>
              <div className="admin-app-card-top">
                <div>
                  <p className="eyebrow">Static Snapshot</p>
                  <h2>{app.title}</h2>
                  <p>{app.summary}</p>
                </div>

                <div className="admin-app-actions">
                  <a
                    className="admin-secondary-button"
                    href={app.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    앱 열기
                  </a>
                </div>
              </div>

              <div className="admin-app-meta" aria-label={`${app.title} 태그`}>
                {app.tags.slice(0, 5).map((tag) => (
                  <span className="admin-meta-pill" key={tag}>
                    #{tag}
                  </span>
                ))}
                {app.subject ? (
                  <span className="admin-meta-pill">과목 {app.subject}</span>
                ) : null}
                {app.grade ? (
                  <span className="admin-meta-pill">학년 {app.grade}</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
