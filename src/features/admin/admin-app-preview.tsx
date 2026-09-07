import type { AdminAppRecord } from "@/lib/apps/types";
import type { AppAudience, AppInteractionType } from "@/lib/apps/metadata";

export interface AdminAppDraft {
  audience?: AppAudience;
  grade?: string;
  interactionType?: AppInteractionType;
  learningProcess?: string[];
  subject?: string;
  summary?: string;
  tags?: string[];
  thumbnailUrl?: string | null;
  title?: string;
  url?: string;
}

const AUDIENCE_LABELS: Record<AppAudience, string> = {
  student: "학생",
  teacher: "교사",
  mixed: "학생·교사"
};

const INTERACTION_LABELS: Record<AppInteractionType, string> = {
  simulation: "시뮬레이션",
  practice: "연습·문제 해결",
  collaboration: "협업·토론",
  creation: "창작·제작",
  management: "기록·관리",
  reference: "자료 탐색",
  utility: "변환·도구"
};

interface AdminAppPreviewProps {
  app: AdminAppRecord;
  draft?: AdminAppDraft | null;
}

function getSafePreviewUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function AdminAppPreview({ app, draft }: AdminAppPreviewProps) {
  const title =
    draft?.title === undefined ? app.title : draft.title.trim() || "제목 없음";
  const summary =
    draft?.summary === undefined
      ? app.summary
      : draft.summary.trim() || "설명을 입력해 주세요.";
  const tags = draft?.tags === undefined ? app.tags : draft.tags;
  const subject =
    draft?.subject === undefined ? app.subject : draft.subject.trim() || undefined;
  const grade =
    draft?.grade === undefined ? app.grade : draft.grade.trim() || undefined;
  const audience = draft?.audience === undefined ? app.audience : draft.audience;
  const interactionType =
    draft?.interactionType === undefined
      ? app.interactionType
      : draft.interactionType;
  const learningProcess =
    draft?.learningProcess === undefined
      ? app.learningProcess ?? []
      : draft.learningProcess;
  const url = draft?.url === undefined ? app.url : draft.url.trim();
  const safeUrl = getSafePreviewUrl(url);
  const thumbnailUrl =
    draft?.thumbnailUrl === undefined ? app.thumbnailUrl : draft.thumbnailUrl;

  return (
    <aside aria-label="공개 카드 미리보기" className="admin-app-preview">
      <div className="admin-app-preview-header">
        <div>
          <p className="eyebrow">Public Card Preview</p>
          <h3>저장 전 공개 카드</h3>
        </div>
        <span>임시 내용</span>
      </div>
      <article className="admin-preview-card">
        <div className="admin-preview-media">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={thumbnailUrl} />
          ) : (
            <span>{subject || "교사용 웹앱"}</span>
          )}
        </div>
        <div className="admin-preview-body">
          <p className="admin-preview-title">{title}</p>
          <p>{summary}</p>
          <div className="admin-preview-meta">
            {[subject, grade].filter(Boolean).map((value) => (
              <span key={value}>{value}</span>
            ))}
            {audience ? <span>대상 {AUDIENCE_LABELS[audience]}</span> : null}
            {interactionType ? (
              <span>활동 {INTERACTION_LABELS[interactionType]}</span>
            ) : null}
          </div>
          <div className="admin-preview-tags">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          {learningProcess.length > 0 ? (
            <p className="admin-preview-process">
              과정 {learningProcess.join(" → ")}
            </p>
          ) : null}
          {safeUrl ? (
            <a
              className="admin-preview-link"
              href={safeUrl}
              rel="noreferrer"
              target="_blank"
            >
              실행 링크 확인
            </a>
          ) : (
            <small>http(s) 실행 링크를 입력하면 바로 확인할 수 있습니다.</small>
          )}
        </div>
      </article>
    </aside>
  );
}
