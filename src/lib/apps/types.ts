export type ThumbnailMode = "auto" | "upload" | "placeholder";

interface BaseAppRecord {
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

export type PublicAppRecord = BaseAppRecord;

export interface AdminAppRecord extends BaseAppRecord {
  githubUrl?: string;
}

export interface AppInput {
  title: string;
  summary: string;
  url: string;
  githubUrl?: string;
  tags: string[];
  thumbnailMode: ThumbnailMode;
  thumbnailUrl?: string;
  subject?: string;
  grade?: string;
  memo?: string;
}
