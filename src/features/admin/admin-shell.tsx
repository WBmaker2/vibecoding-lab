import { createAppAction, logoutAction } from "@/app/admin/actions";
import type { AppRecord } from "@/lib/apps/types";
import { AppForm } from "./app-form";
import { AppList } from "./app-list";

interface AdminShellProps {
  apps: AppRecord[];
}

export function AdminShell({ apps }: AdminShellProps) {
  return (
    <main className="page-shell admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Private Admin</p>
          <h1>앱 등록 관리</h1>
          <p className="admin-header-copy">
            새 앱을 등록하고, 기존 앱의 태그와 공개 메모를 바로 수정할 수
            있습니다.
          </p>
        </div>

        <form action={logoutAction}>
          <button className="admin-secondary-button" type="submit">
            로그아웃
          </button>
        </form>
      </header>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2>새 앱 등록</h2>
          <p>기본 정보는 단순하게, 추가 정보는 필요할 때만 입력합니다.</p>
        </div>
        <AppForm action={createAppAction} submitLabel="앱 등록" />
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2>등록된 앱</h2>
          <p>{apps.length}개의 앱이 등록되어 있습니다.</p>
        </div>
        <AppList apps={apps} />
      </section>
    </main>
  );
}
