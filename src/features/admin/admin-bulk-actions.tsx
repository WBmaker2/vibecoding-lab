"use client";

import { useState } from "react";
import type { AdminAppRecord } from "@/lib/apps/types";

export interface BulkTagUpdate {
  id: string;
  tags: string[];
}

export type BulkClassificationField =
  | "audience"
  | "grade"
  | "interactionType"
  | "subject";

export interface BulkClassificationUpdate {
  field: BulkClassificationField;
  id: string;
  value: string;
}

interface AdminBulkActionsProps {
  action: (formData: FormData) => void | Promise<void>;
  classificationAction: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
  onClassificationComplete: (updates: BulkClassificationUpdate[]) => void;
  onComplete: (updates: BulkTagUpdate[]) => void;
  onClear: () => void;
  selectedApps: AdminAppRecord[];
}

function getNextTags(app: AdminAppRecord, mode: "add" | "remove", tag: string) {
  return mode === "add"
    ? [...new Set([...app.tags, tag])]
    : app.tags.filter((item) => item !== tag);
}

export function AdminBulkActions({
  action,
  classificationAction,
  disabled = false,
  onClassificationComplete,
  onComplete,
  onClear,
  selectedApps
}: AdminBulkActionsProps) {
  const [tag, setTag] = useState("");
  const [classificationField, setClassificationField] =
    useState<BulkClassificationField>("subject");
  const [classificationValue, setClassificationValue] = useState("");
  const [pendingMode, setPendingMode] = useState<
    "add" | "remove" | "classification" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  async function updateTags(mode: "add" | "remove") {
    const normalizedTag = tag.trim().replace(/^#+/u, "").trim();

    if (!normalizedTag || selectedApps.length === 0 || pendingMode) return;

    if (
      mode === "remove" &&
      selectedApps.some(
        (app) => app.tags.length === 1 && app.tags[0] === normalizedTag
      )
    ) {
      setError(
        "선택한 앱 중 태그가 하나뿐인 앱이 있습니다. 먼저 다른 태그를 추가해 주세요."
      );
      return;
    }

    const actionLabel = mode === "add" ? "추가" : "삭제";
    const previewTitles = selectedApps
      .slice(0, 3)
      .map((app) => app.title)
      .join(", ");
    const moreCount = selectedApps.length - Math.min(3, selectedApps.length);
    const targetLabel = moreCount > 0 ? `${previewTitles} 외 ${moreCount}개` : previewTitles;
    const preview = selectedApps
      .slice(0, 3)
      .map((app) => {
        const nextTags = getNextTags(app, mode, normalizedTag);
        return `${app.title}: ${app.tags.map((item) => `#${item}`).join(" ")} → ${nextTags
          .map((item) => `#${item}`)
          .join(" ") || "태그 없음"}`;
      })
      .join("\n");

    if (
      !window.confirm(
        `${targetLabel} 앱 ${selectedApps.length}개에 #${normalizedTag} 태그를 ${actionLabel}할까요?\n\n${preview}`
      )
    ) {
      return;
    }

    setError(null);
    setPendingMode(mode);

    try {
      const formData = new FormData();
      formData.set("ids", selectedApps.map((app) => app.id).join(","));
      formData.set("mode", mode);
      formData.set("tag", normalizedTag);
      await action(formData);

      const updates = selectedApps.map((app) => ({
        id: app.id,
        tags: getNextTags(app, mode, normalizedTag)
      }));
      onComplete(updates);
      setTag("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "태그 일괄 변경에 실패했습니다. 다시 시도해 주세요."
      );
    } finally {
      setPendingMode(null);
    }
  }

  function getCurrentClassificationValue(
    app: AdminAppRecord,
    field: BulkClassificationField
  ) {
    if (field === "subject") return app.subject ?? "미분류";
    if (field === "grade") return app.grade ?? "미분류";
    if (field === "audience") return app.audience ?? "student";
    return app.interactionType ?? "practice";
  }

  async function updateClassification() {
    const value = classificationValue.trim();
    if (!value || selectedApps.length === 0 || pendingMode) return;

    const fieldLabel =
      classificationField === "subject"
        ? "과목"
        : classificationField === "grade"
          ? "학년"
          : classificationField === "audience"
            ? "사용자"
            : "활동 방식";
    const preview = selectedApps
      .slice(0, 3)
      .map(
        (app) =>
          `${app.title}: ${getCurrentClassificationValue(app, classificationField)} → ${value}`
      )
      .join("\n");
    const moreCount = selectedApps.length - Math.min(3, selectedApps.length);
    const suffix = moreCount > 0 ? `\n외 ${moreCount}개 앱에도 적용됩니다.` : "";

    if (
      !window.confirm(
        `${selectedApps.length}개 앱의 ${fieldLabel}을(를) 다음처럼 변경할까요?\n\n${preview}${suffix}`
      )
    ) {
      return;
    }

    setError(null);
    setPendingMode("classification");

    try {
      const formData = new FormData();
      formData.set("ids", selectedApps.map((app) => app.id).join(","));
      formData.set("field", classificationField);
      formData.set("value", value);
      await classificationAction(formData);
      onClassificationComplete(
        selectedApps.map((app) => ({
          field: classificationField,
          id: app.id,
          value
        }))
      );
      setClassificationValue("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "분류 일괄 변경에 실패했습니다. 다시 시도해 주세요."
      );
    } finally {
      setPendingMode(null);
    }
  }

  return (
    <section aria-label="선택 앱 일괄 작업" className="admin-bulk-actions">
      <div className="admin-bulk-copy">
        <div>
          <p className="eyebrow">Batch Edit</p>
          <h3>선택한 앱 {selectedApps.length}개</h3>
        </div>
        <button
          className="admin-text-button"
          onClick={onClear}
          type="button"
        >
          선택 해제
        </button>
      </div>
      <p>
        공통 태그를 한 번에 추가하거나 삭제합니다. 폼에 저장하지 않은 변경이
        있으면 먼저 저장해 주세요.
      </p>
      <div className="admin-bulk-controls">
        <label className="admin-bulk-tag-field">
          <span>태그</span>
          <input
            aria-label="일괄 변경 태그"
            disabled={disabled || pendingMode !== null}
            onChange={(event) => setTag(event.target.value)}
            placeholder="#과학 또는 과학"
            value={tag}
          />
        </label>
        <button
          className="admin-secondary-button"
          disabled={disabled || !tag.trim() || pendingMode !== null}
          onClick={() => void updateTags("add")}
          type="button"
        >
          {pendingMode === "add" ? "추가 중..." : "태그 추가"}
        </button>
        <button
          className="admin-danger-button"
          disabled={disabled || !tag.trim() || pendingMode !== null}
          onClick={() => void updateTags("remove")}
          type="button"
        >
          {pendingMode === "remove" ? "삭제 중..." : "태그 삭제"}
        </button>
      </div>
      <div className="admin-bulk-classification">
        <div className="admin-bulk-classification-controls">
          <label className="admin-bulk-tag-field">
            <span>분류 항목</span>
            <select
              aria-label="일괄 변경 분류 항목"
              disabled={disabled || pendingMode !== null}
              onChange={(event) =>
                setClassificationField(event.target.value as BulkClassificationField)
              }
              value={classificationField}
            >
              <option value="subject">과목</option>
              <option value="grade">학년</option>
              <option value="audience">사용자</option>
              <option value="interactionType">활동 방식</option>
            </select>
          </label>
          {classificationField === "audience" ? (
            <label className="admin-bulk-tag-field">
              <span>새 값</span>
              <select
                aria-label="일괄 변경 분류 값"
                disabled={disabled || pendingMode !== null}
                onChange={(event) => setClassificationValue(event.target.value)}
                value={classificationValue}
              >
                <option value="">선택하세요</option>
                <option value="student">학생</option>
                <option value="teacher">교사</option>
                <option value="mixed">학생·교사</option>
              </select>
            </label>
          ) : classificationField === "interactionType" ? (
            <label className="admin-bulk-tag-field">
              <span>새 값</span>
              <select
                aria-label="일괄 변경 분류 값"
                disabled={disabled || pendingMode !== null}
                onChange={(event) => setClassificationValue(event.target.value)}
                value={classificationValue}
              >
                <option value="">선택하세요</option>
                <option value="practice">연습·문제 해결</option>
                <option value="simulation">시뮬레이션</option>
                <option value="collaboration">협업</option>
                <option value="creation">창작</option>
                <option value="management">관리</option>
                <option value="reference">자료 탐색</option>
                <option value="utility">도구</option>
              </select>
            </label>
          ) : (
            <label className="admin-bulk-tag-field">
              <span>새 값</span>
              <input
                aria-label="일괄 변경 분류 값"
                disabled={disabled || pendingMode !== null}
                onChange={(event) => setClassificationValue(event.target.value)}
                placeholder={classificationField === "subject" ? "예: 과학" : "예: 초등 5학년"}
                value={classificationValue}
              />
            </label>
          )}
          <button
            className="admin-secondary-button"
            disabled={disabled || !classificationValue.trim() || pendingMode !== null}
            onClick={() => void updateClassification()}
            type="button"
          >
            {pendingMode === "classification" ? "변경 중..." : "분류 적용"}
          </button>
        </div>
        <p>선택한 앱의 과목·학년·사용자·활동 방식을 한 번에 맞춥니다.</p>
      </div>
      {disabled ? (
        <p className="admin-bulk-hint">현재 입력을 저장한 뒤 일괄 작업을 사용할 수 있습니다.</p>
      ) : null}
      {error ? (
        <p aria-live="polite" className="admin-form-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
