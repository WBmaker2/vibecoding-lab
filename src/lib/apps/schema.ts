import { z } from "zod";
import { isSupportedThumbnailUrl } from "@/lib/storage/public-thumbnail";
import { normalizeTags } from "./tags";
import { APP_AUDIENCES, GRADE_BANDS, INTERACTION_TYPES, normalizeAppMetadata } from "./metadata";

const optionalText = z.string().trim().min(1).optional().or(z.literal("").transform(() => undefined));
const githubHosts = new Set(["github.com", "www.github.com"]);
const thumbnailUrl = z
  .string()
  .url()
  .refine(isSupportedThumbnailUrl, {
    message: "썸네일은 http(s) 이미지 주소 또는 업로드 이미지 데이터만 사용할 수 있습니다."
  })
  .optional();

function isGitHubUrl(value: string) {
  try {
    return githubHosts.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

const optionalGithubUrl = optionalText.refine(
  (value) => value === undefined || isGitHubUrl(value),
  {
    message: "GitHub 링크만 입력하실 수 있습니다."
  }
);

export const appInputSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(160),
  url: z.string().url(),
  githubUrl: optionalGithubUrl,
  tags: z
    .array(z.string())
    .transform(normalizeTags)
    .pipe(z.array(z.string().min(1)).min(1)),
  thumbnailMode: z.enum(["auto", "upload", "placeholder"]),
  thumbnailUrl,
  subject: optionalText,
  grade: optionalText,
  memo: optionalText,
  subjects: z.array(z.string()).optional(),
  gradeBands: z.array(z.enum(GRADE_BANDS)).optional(),
  audience: z.enum(APP_AUDIENCES).optional(),
  interactionType: z.enum(INTERACTION_TYPES).optional(),
  learningProcess: z.array(z.string()).optional()
}).transform((input) => ({ ...input, ...normalizeAppMetadata(input) }));

export type AppInputSchema = z.infer<typeof appInputSchema>;
