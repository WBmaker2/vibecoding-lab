"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/auth/session";
import { getAppRepository } from "@/lib/apps/repository";
import { appInputSchema } from "@/lib/apps/schema";
import { normalizeTags as normalizeAppTags } from "@/lib/apps/tags";
import { resolveThumbnailInput } from "@/lib/storage/thumbnails";

function normalizeTags(formData: FormData) {
  const raw = String(formData.get("tagsJson") ?? "[]");
  const parsed = JSON.parse(raw) as string[];

  return normalizeAppTags(parsed);
}

async function getAppInput(formData: FormData) {
  const sourceUrl = String(formData.get("url") ?? "");
  const mode = String(formData.get("thumbnailMode") ?? "auto") as
    | "auto"
    | "upload"
    | "placeholder";
  const thumbnailFile = formData.get("thumbnailFile");
  const resolvedThumbnail = await resolveThumbnailInput({
    mode,
    file: thumbnailFile instanceof File ? thumbnailFile : null,
    sourceUrl,
    thumbnailUrl: String(formData.get("thumbnailUrl") ?? "") || undefined
  });

  return appInputSchema.parse({
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    url: sourceUrl,
    githubUrl: String(formData.get("githubUrl") ?? "") || undefined,
    tags: normalizeTags(formData),
    thumbnailMode: resolvedThumbnail.thumbnailMode,
    thumbnailUrl: resolvedThumbnail.thumbnailUrl ?? undefined,
    subject: String(formData.get("subject") ?? "") || undefined,
    grade: String(formData.get("grade") ?? "") || undefined,
    memo: String(formData.get("memo") ?? "") || undefined
  });
}

function revalidateArchive() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createAppAction(formData: FormData) {
  const repo = getAppRepository();
  const input = await getAppInput(formData);

  await repo.createApp(input);
  revalidateArchive();
}

export async function updateAppAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const repo = getAppRepository();
  const input = await getAppInput(formData);

  await repo.updateApp(id, input);
  revalidateArchive();
}

export async function deleteAppAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const repo = getAppRepository();

  await repo.deleteApp(id);
  revalidateArchive();
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
