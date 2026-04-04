import Link from "next/link";
import type { AppRecord } from "@/lib/apps/types";
import { deleteAppAction, updateAppAction } from "@/app/admin/actions";
import { AppForm } from "./app-form";

interface AppListProps {
  apps: AppRecord[];
  suggestedTags: string[];
}

export function AppList({ apps, suggestedTags }: AppListProps) {
  return (
    <div className="admin-app-list">
      {apps.map((app) => (
        <article className="admin-app-card" key={app.id}>
          <div className="admin-app-card-top">
            <div>
              <p className="eyebrow">Registered App</p>
              <h2>{app.title}</h2>
              <p>{app.summary}</p>
            </div>

            <div className="admin-app-actions">
              <Link href={app.url} rel="noreferrer" target="_blank">
                앱 열기
              </Link>
              <form action={deleteAppAction}>
                <input name="id" type="hidden" value={app.id} />
                <button className="admin-danger-button" type="submit">
                  삭제
                </button>
              </form>
            </div>
          </div>

          <details className="admin-edit-panel">
            <summary>이 앱 수정</summary>
            <AppForm
              action={updateAppAction}
              initialApp={app}
              submitLabel="수정 저장"
              suggestedTags={suggestedTags}
            />
          </details>
        </article>
      ))}
    </div>
  );
}
