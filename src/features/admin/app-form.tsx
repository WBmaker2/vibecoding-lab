"use client";

import type { AdminAppRecord } from "@/lib/apps/types";
import { TagInput } from "./tag-input";
import { ThumbnailControls } from "./thumbnail-controls";

interface AppFormProps {
  action: (formData: FormData) => void | Promise<void>;
  initialApp?: AdminAppRecord;
  onCancelEdit?: () => void;
  suggestedTags?: string[];
  submitLabel: string;
}

export function AppForm({
  action,
  initialApp,
  onCancelEdit,
  submitLabel,
  suggestedTags
}: AppFormProps) {
  return (
    <form action={action} className="admin-app-form">
      {initialApp && <input name="id" type="hidden" value={initialApp.id} />}

      <section className="admin-form-section">
        <div className="admin-form-section-copy">
          <h3>1. 기본 정보</h3>
          <p>
            제목, 한 줄 설명, 링크만 먼저 채워도 등록하실 수 있고, GitHub
            링크는 선택 입력으로 남겨 두실 수 있습니다.
          </p>
        </div>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>제목</span>
            <input defaultValue={initialApp?.title} name="title" required />
          </label>

          <div className="admin-field admin-field-full">
            <label htmlFor="admin-summary">한 줄 설명</label>
            <textarea
              defaultValue={initialApp?.summary}
              id="admin-summary"
              name="summary"
              required
              rows={3}
              aria-describedby="admin-summary-hint"
            />
            <small className="admin-field-hint" id="admin-summary-hint">
              누가 무엇을 하기 위한 앱인지 한두 문장으로 적어 주세요.
            </small>
          </div>

          <label className="admin-field admin-field-full">
            <span>앱 링크</span>
            <input
              defaultValue={initialApp?.url}
              name="url"
              placeholder="https://..."
              required
              type="url"
            />
          </label>

          <label className="admin-field admin-field-full" htmlFor="github-url">
            <span>GitHub 링크</span>
            <input
              defaultValue={initialApp?.githubUrl}
              id="github-url"
              name="githubUrl"
              placeholder="https://github.com/..."
              type="url"
            />
            <small className="admin-field-hint">
              선택 입력이며, 관리자 작업실에서만 참고 자료로 활용됩니다.
            </small>
          </label>
        </div>
      </section>

      <section className="admin-form-section">
        <div className="admin-form-section-copy">
          <h3>2. 태그 선택</h3>
          <p>
            직접 입력해도 되고, 아래에 쌓인 기존 태그를 눌러 빠르게 재사용하실
            수 있습니다.
          </p>
        </div>

        <div
          aria-labelledby="admin-tags-field-label"
          className="admin-field"
          role="group"
        >
          <span id="admin-tags-field-label">태그</span>
          <TagInput
            inputLabelledBy="admin-tags-field-label"
            initialTags={initialApp?.tags}
            name="tagsJson"
            suggestedTags={suggestedTags}
          />
        </div>
      </section>

      <section className="admin-form-section">
        <div className="admin-form-section-copy">
          <h3>3. 썸네일</h3>
          <p>
            링크에서 자동 수집하거나, 직접 업로드하거나, 기본 이미지를 고르실
            수 있습니다.
          </p>
        </div>

        <ThumbnailControls
          initialMode={initialApp?.thumbnailMode}
          initialUrl={initialApp?.thumbnailUrl}
        />
      </section>

      <section className="admin-form-section">
        <div className="admin-form-section-copy">
          <h3>4. 추가 정보</h3>
          <p>
            과목, 학년, 사용자, 활동 과정, 메이커 노트는 공개 앱 상세의 사실
            정보로 함께 노출됩니다.
          </p>
        </div>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>과목</span>
            <input defaultValue={initialApp?.subject} name="subject" />
          </label>

          <label className="admin-field">
            <span>학년</span>
            <input defaultValue={initialApp?.grade} name="grade" />
          </label>

          <label className="admin-field">
            <span>사용자</span>
            <select defaultValue={initialApp?.audience ?? "student"} name="audience">
              <option value="student">학생</option><option value="teacher">교사</option><option value="mixed">학생·교사</option>
            </select>
          </label>
          <label className="admin-field">
            <span>상호작용 유형</span>
            <select defaultValue={initialApp?.interactionType ?? "practice"} name="interactionType">
              <option value="practice">연습·문제 해결</option><option value="simulation">시뮬레이션</option><option value="collaboration">협업</option><option value="creation">창작</option><option value="management">관리</option><option value="reference">자료 탐색</option><option value="utility">도구</option>
            </select>
          </label>
          <div className="admin-field admin-field-full">
            <label htmlFor="admin-learning-process">학습 과정</label>
            <input
              aria-describedby="admin-learning-process-hint"
              defaultValue={initialApp?.learningProcess?.join(", ")}
              id="admin-learning-process"
              name="learningProcess"
              placeholder="예측, 조작, 비교, 설명"
            />
            <small
              className="admin-field-hint"
              id="admin-learning-process-hint"
            >
              학생이 실제로 거치는 활동 순서를 쉼표로 구분해 주세요.
            </small>
          </div>

          <div className="admin-field admin-field-full">
            <label htmlFor="admin-memo">메이커 노트</label>
            <textarea
              aria-describedby="admin-memo-hint"
              defaultValue={initialApp?.memo}
              id="admin-memo"
              name="memo"
              rows={4}
            />
            <small className="admin-field-hint" id="admin-memo-hint">
              수업이나 업무에서 언제, 어떻게 활용하는지 적어 주세요.
            </small>
          </div>
        </div>
      </section>

      <div className="admin-form-actions">
        {onCancelEdit && (
          <button
            className="admin-secondary-button"
            onClick={onCancelEdit}
            type="button"
          >
            새 앱 등록으로 전환
          </button>
        )}

        <button className="admin-primary-button" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
