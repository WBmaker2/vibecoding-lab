"use client";

import { useState } from "react";
import type { ThumbnailMode } from "@/lib/apps/types";

interface ThumbnailControlsProps {
  initialMode?: ThumbnailMode;
  initialUrl?: string | null;
}

export function ThumbnailControls({
  initialMode = "auto",
  initialUrl = null
}: ThumbnailControlsProps) {
  const [mode, setMode] = useState<ThumbnailMode>(initialMode);
  const [url, setUrl] = useState(initialUrl ?? "");
  const hasExistingThumbnail = Boolean(initialUrl);

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

      {mode === "placeholder" && hasExistingThumbnail && (
        <div className="thumbnail-reset-guard">
          <label>
            <input
              name="allowPlaceholderReset"
              type="checkbox"
              value="on"
            />
            기존 썸네일을 기본 이미지로 바꾸겠습니다.
          </label>
          <p>
            체크하지 않고 저장하면 현재 썸네일을 유지합니다. 실수로 이미지가
            사라지는 것을 막기 위한 안전장치입니다.
          </p>
        </div>
      )}
    </div>
  );
}
