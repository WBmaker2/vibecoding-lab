import { z } from "zod";

const optionalText = z.string().trim().min(1).optional().or(z.literal("").transform(() => undefined));

export const appInputSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(160),
  url: z.string().url(),
  tags: z.array(z.string().trim().min(1)).min(1),
  thumbnailMode: z.enum(["auto", "upload", "placeholder"]),
  thumbnailUrl: z.string().url().optional(),
  subject: optionalText,
  grade: optionalText,
  memo: optionalText
});

export type AppInputSchema = z.infer<typeof appInputSchema>;
