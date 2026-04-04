export type ThumbnailMode = "auto" | "upload" | "placeholder";

export interface AppRecord {
  id: string;
  title: string;
  summary: string;
  url: string;
  tags: string[];
  thumbnailMode: ThumbnailMode;
  thumbnailUrl: string | null;
  subject?: string;
  grade?: string;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppInput {
  title: string;
  summary: string;
  url: string;
  tags: string[];
  thumbnailMode: ThumbnailMode;
  thumbnailUrl?: string;
  subject?: string;
  grade?: string;
  memo?: string;
}
