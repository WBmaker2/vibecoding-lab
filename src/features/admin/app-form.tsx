import type { AppRecord } from "@/lib/apps/types";
import { TagInput } from "./tag-input";
import { ThumbnailControls } from "./thumbnail-controls";

interface AppFormProps {
  action: (formData: FormData) => void | Promise<void>;
  initialApp?: AppRecord;
  suggestedTags?: string[];
  submitLabel: string;
}

export function AppForm({
  action,
  initialApp,
  submitLabel,
  suggestedTags
}: AppFormProps) {
  return (
    <form action={action} className="admin-app-form">
      {initialApp && <input name="id" type="hidden" value={initialApp.id} />}

      <label className="admin-field">
        <span>제목</span>
        <input defaultValue={initialApp?.title} name="title" required />
      </label>

      <label className="admin-field">
        <span>한 줄 설명</span>
        <textarea
          defaultValue={initialApp?.summary}
          name="summary"
          required
          rows={3}
        />
      </label>

      <label className="admin-field">
        <span>앱 링크</span>
        <input
          defaultValue={initialApp?.url}
          name="url"
          placeholder="https://..."
          required
          type="url"
        />
      </label>

      <label className="admin-field">
        <span>태그</span>
        <TagInput
          initialTags={initialApp?.tags}
          name="tagsJson"
          suggestedTags={suggestedTags}
        />
      </label>

      <ThumbnailControls
        initialMode={initialApp?.thumbnailMode}
        initialUrl={initialApp?.thumbnailUrl}
      />

      <details className="admin-extra-fields">
        <summary>추가 정보</summary>

        <div className="admin-extra-grid">
          <label className="admin-field">
            <span>과목</span>
            <input defaultValue={initialApp?.subject} name="subject" />
          </label>

          <label className="admin-field">
            <span>학년</span>
            <input defaultValue={initialApp?.grade} name="grade" />
          </label>

          <label className="admin-field admin-field-full">
            <span>메모</span>
            <textarea defaultValue={initialApp?.memo} name="memo" rows={4} />
          </label>
        </div>
      </details>

      <button className="admin-primary-button" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
