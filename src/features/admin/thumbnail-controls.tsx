"use client";

import { useState } from "react";
import type { ThumbnailMode } from "@/lib/apps/types";

interface ThumbnailControlsProps {
  initialMode?: ThumbnailMode;
  initialUrl?: string | null;
}

export function ThumbnailControls({
  initialMode = "placeholder",
  initialUrl = null
}: ThumbnailControlsProps) {
  const [mode, setMode] = useState<ThumbnailMode>(initialMode);
  const [url, setUrl] = useState(initialUrl ?? "");

  return (
    <div className="thumbnail-controls">
      <fieldset className="thumbnail-mode-group">
        <legend>썸네일 방식</legend>

        <label>
          <input
            checked={mode === "auto"}
            name="thumbnailMode"
            onChange={() => setMode("auto")}
            type="radio"
            value="auto"
          />
          링크에서 자동 수집
        </label>
        <label>
          <input
            checked={mode === "upload"}
            name="thumbnailMode"
            onChange={() => setMode("upload")}
            type="radio"
            value="upload"
          />
          직접 이미지 업로드
        </label>
        <label>
          <input
            checked={mode === "placeholder"}
            name="thumbnailMode"
            onChange={() => setMode("placeholder")}
            type="radio"
            value="placeholder"
          />
          기본 이미지 사용
        </label>
      </fieldset>

      {mode === "upload" && (
        <label className="admin-field">
          <span>썸네일 이미지</span>
          <input accept="image/*" name="thumbnailFile" type="file" />
        </label>
      )}

      {mode !== "placeholder" && (
        <label className="admin-field">
          <span>기존 썸네일 URL</span>
          <input
            name="thumbnailUrl"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="기존 URL이 있으면 유지"
            type="url"
            value={url}
          />
        </label>
      )}
    </div>
  );
}
