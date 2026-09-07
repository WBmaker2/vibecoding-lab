"use client";

import type {
  AppAudience,
  AppInteractionType,
  GradeBand
} from "@/lib/apps/metadata";

export interface ArchiveCollectionPreset {
  audience?: AppAudience;
  gradeBands?: GradeBand[];
  id: string;
  interactionTypes?: AppInteractionType[];
  label: string;
  subjects?: string[];
}

export const ARCHIVE_COLLECTIONS: ArchiveCollectionPreset[] = [
  {
    id: "science-upper-elementary",
    label: "초등 5~6학년 과학",
    subjects: ["과학"],
    gradeBands: ["5-6"]
  },
  {
    id: "teacher-workflow",
    label: "교사 업무 도구",
    audience: "teacher"
  },
  {
    id: "active-classroom",
    label: "활동형 수업",
    interactionTypes: ["simulation", "collaboration", "creation"]
  }
];

interface ArchiveCollectionsProps {
  activeId?: string | null;
  onSelect: (collection: ArchiveCollectionPreset) => void;
}

export function ArchiveCollections({
  activeId = null,
  onSelect
}: ArchiveCollectionsProps) {
  return (
    <nav aria-label="빠른 수업 모음" className="archive-collections">
      <p className="archive-collections-label">빠른 수업 모음</p>
      <div className="archive-collection-list">
        {ARCHIVE_COLLECTIONS.map((collection) => (
          <button
            aria-pressed={activeId === collection.id}
            className={`archive-collection-button${activeId === collection.id ? " is-active" : ""}`}
            key={collection.id}
            onClick={() => onSelect(collection)}
            type="button"
          >
            {collection.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
