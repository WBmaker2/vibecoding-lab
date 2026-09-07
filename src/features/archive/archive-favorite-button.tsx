"use client";

interface ArchiveFavoriteButtonProps {
  appTitle: string;
  isFavorite: boolean;
  onToggle: () => void;
}

export function ArchiveFavoriteButton({
  appTitle,
  isFavorite,
  onToggle
}: ArchiveFavoriteButtonProps) {
  return (
    <button
      aria-label={
        isFavorite
          ? `${appTitle} 보관함에서 제거`
          : `${appTitle} 보관함에 저장`
      }
      aria-pressed={isFavorite}
      className={`app-card-save-button${isFavorite ? " is-saved" : ""}`}
      onClick={onToggle}
      type="button"
    >
      <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
      {isFavorite ? "저장됨" : "저장"}
    </button>
  );
}
