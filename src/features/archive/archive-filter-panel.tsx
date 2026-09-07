"use client";

import type {
  AppAudience,
  AppInteractionType,
  GradeBand
} from "@/lib/apps/metadata";
import {
  AUDIENCE_LABELS,
  GRADE_BAND_LABELS,
  INTERACTION_LABELS,
  type ArchiveFilterOptions
} from "./archive-filter-options";

interface ArchiveFilterPanelProps {
  audience: AppAudience | "all";
  gradeBands: GradeBand[];
  interactionTypes: AppInteractionType[];
  isOpen: boolean;
  onAudienceChange: (value: AppAudience | "all") => void;
  onClose: () => void;
  onGradeBandToggle: (value: GradeBand) => void;
  onInteractionTypeToggle: (value: AppInteractionType) => void;
  onReset: () => void;
  onSubjectToggle: (value: string) => void;
  selectedSubjects: string[];
  options: ArchiveFilterOptions;
}

function FilterOption({
  checked,
  count,
  label,
  onChange,
  value
}: {
  checked: boolean;
  count: number;
  label: string;
  onChange: () => void;
  value: string;
}) {
  return (
    <label className="archive-filter-option">
      <input checked={checked} onChange={onChange} type="checkbox" value={value} />
      <span>{label}</span>
      <small>{count}</small>
    </label>
  );
}

export function ArchiveFilterPanel({
  audience,
  gradeBands,
  interactionTypes,
  isOpen,
  onAudienceChange,
  onClose,
  onGradeBandToggle,
  onInteractionTypeToggle,
  onReset,
  onSubjectToggle,
  selectedSubjects,
  options
}: ArchiveFilterPanelProps) {
  const selectedCount =
    selectedSubjects.length +
    gradeBands.length +
    interactionTypes.length +
    (audience === "all" ? 0 : 1);

  return (
    <aside
      aria-label="앱 분류 필터"
      className={`archive-filter-panel${isOpen ? " is-open" : ""}`}
      data-open={isOpen}
    >
      <div className="archive-filter-panel-header">
        <div>
          <p className="archive-filter-eyebrow">Browse by fit</p>
          <h2>수업 조건으로 찾기</h2>
        </div>
        <button
          aria-label="필터 패널 닫기"
          className="archive-filter-close"
          onClick={onClose}
          type="button"
        >
          닫기
        </button>
      </div>

      <div className="archive-filter-section">
        <p className="archive-filter-section-title">대상</p>
        <div className="archive-filter-options">
          {options.audiences.map((option) => (
            <label className="archive-filter-option" key={option.value}>
              <input
                checked={audience === option.value}
                name="archive-audience"
                onChange={() => onAudienceChange(option.value)}
                type="radio"
                value={option.value}
              />
              <span>{AUDIENCE_LABELS[option.value]}</span>
              <small>{option.count}</small>
            </label>
          ))}
        </div>
      </div>

      <div className="archive-filter-section">
        <p className="archive-filter-section-title">교과</p>
        <div className="archive-filter-options">
          {options.subjects.map((option) => (
            <FilterOption
              checked={selectedSubjects.includes(option.value)}
              count={option.count}
              key={option.value}
              label={option.value}
              onChange={() => onSubjectToggle(option.value)}
              value={option.value}
            />
          ))}
        </div>
      </div>

      <div className="archive-filter-section">
        <p className="archive-filter-section-title">학년군</p>
        <div className="archive-filter-options">
          {options.gradeBands.map((option) => (
            <FilterOption
              checked={gradeBands.includes(option.value)}
              count={option.count}
              key={option.value}
              label={GRADE_BAND_LABELS[option.value]}
              onChange={() => onGradeBandToggle(option.value)}
              value={option.value}
            />
          ))}
        </div>
      </div>

      <div className="archive-filter-section">
        <p className="archive-filter-section-title">활동 방식</p>
        <div className="archive-filter-options">
          {options.interactionTypes.map((option) => (
            <FilterOption
              checked={interactionTypes.includes(option.value)}
              count={option.count}
              key={option.value}
              label={INTERACTION_LABELS[option.value]}
              onChange={() => onInteractionTypeToggle(option.value)}
              value={option.value}
            />
          ))}
        </div>
      </div>

      <div className="archive-filter-panel-actions">
        <span>{selectedCount > 0 ? `조건 ${selectedCount}개 선택` : "조건 없음"}</span>
        <button className="reset-filters-button" onClick={onReset} type="button">
          조건 초기화
        </button>
      </div>
    </aside>
  );
}
