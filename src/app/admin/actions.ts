"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, hasAdminSession } from "@/lib/auth/session";
import { getAppRepository } from "@/lib/apps/repository";
import { appInputSchema } from "@/lib/apps/schema";
import {
  APP_AUDIENCES,
  INTERACTION_TYPES,
  normalizeAppMetadata,
  type AppAudience,
  type AppInteractionType
} from "@/lib/apps/metadata";
import { normalizeTag, normalizeTags as normalizeAppTags } from "@/lib/apps/tags";
import type { AdminAppRecord, AppInput } from "@/lib/apps/types";
import { resolveThumbnailInput } from "@/lib/storage/thumbnails";

function parseList(value: FormDataEntryValue | null) {
  return String(value ?? "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeTags(formData: FormData) {
  const raw = String(formData.get("tagsJson") ?? "[]");
  const parsed = JSON.parse(raw) as string[];

  return normalizeAppTags(parsed);
}

async function getAppInput(
  formData: FormData,
  existingApp?: Pick<AdminAppRecord, "thumbnailMode" | "thumbnailUrl">
) {
  const sourceUrl = String(formData.get("url") ?? "");
  const mode = String(formData.get("thumbnailMode") ?? "auto") as
    | "auto"
    | "upload"
    | "placeholder";
  const thumbnailFile = formData.get("thumbnailFile");
  const resolvedThumbnail = await resolveThumbnailInput({
    allowPlaceholderReset: formData.get("allowPlaceholderReset") === "on",
    existingThumbnailMode: existingApp?.thumbnailMode,
    existingThumbnailUrl: existingApp?.thumbnailUrl,
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
    memo: String(formData.get("memo") ?? "") || undefined,
    audience: String(formData.get("audience") ?? "") || undefined,
    interactionType: String(formData.get("interactionType") ?? "") || undefined,
    learningProcess: parseList(formData.get("learningProcess"))
  });
}

function revalidateAdmin() {
  revalidatePath("/admin");
}

async function requireAdminSession() {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }
}

export async function createAppAction(formData: FormData) {
  await requireAdminSession();
  const repo = getAppRepository();
  const input = await getAppInput(formData);

  await repo.createApp(input);
  revalidateAdmin();
}

export async function updateAppAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const repo = getAppRepository();
  const existingApp = await repo.getApp(id);

  if (!existingApp) {
    throw new Error("App not found.");
  }

  const input = await getAppInput(formData, existingApp);

  await repo.updateApp(id, input);
  revalidateAdmin();
}

export async function deleteAppAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const repo = getAppRepository();

  await repo.deleteApp(id);
  revalidateAdmin();
}

export async function removeAppTagAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const tag = String(formData.get("tag") ?? "");
  const repo = getAppRepository();

  await repo.removeTag(id, tag);
  revalidateAdmin();
}

export async function bulkUpdateTagsAction(formData: FormData) {
  await requireAdminSession();
  const repo = getAppRepository();
  const ids = [...new Set(parseList(formData.get("ids")))];
  const tag = normalizeTag(String(formData.get("tag") ?? ""));
  const mode = String(formData.get("mode") ?? "add");

  if (ids.length === 0 || !tag || (mode !== "add" && mode !== "remove")) {
    throw new Error("일괄 태그 변경 정보가 올바르지 않습니다.");
  }

  const updates: Array<{ id: string; tags: string[] }> = [];
  for (const id of ids) {
    const app = await repo.getApp(id);
    if (!app) continue;

    const nextTags =
      mode === "remove"
        ? app.tags.filter((item) => item !== tag)
        : normalizeAppTags([...app.tags, tag]);

    if (nextTags.length === 0) {
      throw new Error("마지막 태그는 일괄 삭제할 수 없습니다.");
    }

    if (nextTags.join("|") !== app.tags.join("|")) {
      updates.push({ id, tags: nextTags });
    }
  }

  for (const update of updates) {
    await repo.updateTags(update.id, update.tags);
  }

  revalidateAdmin();
}

export async function bulkUpdateClassificationAction(formData: FormData) {
  await requireAdminSession();
  const repo = getAppRepository();
  const ids = [...new Set(parseList(formData.get("ids")))];
  const field = String(formData.get("field") ?? "");
  const value = String(formData.get("value") ?? "").trim();
  const validField = ["subject", "grade", "audience", "interactionType"].includes(
    field
  );

  if (ids.length === 0 || !value || !validField) {
    throw new Error("일괄 분류 변경 정보가 올바르지 않습니다.");
  }
  if (field === "audience" && !APP_AUDIENCES.includes(value as AppAudience)) {
    throw new Error("사용자 분류 값이 올바르지 않습니다.");
  }
  if (
    field === "interactionType" &&
    !INTERACTION_TYPES.includes(value as AppInteractionType)
  ) {
    throw new Error("활동 방식 값이 올바르지 않습니다.");
  }

  const updates: Array<{ id: string; input: AppInput }> = [];
  for (const id of ids) {
    const app = await repo.getApp(id);
    if (!app) continue;

    const nextSource = {
      ...app,
      subject: field === "subject" ? value : app.subject,
      grade: field === "grade" ? value : app.grade,
      audience:
        field === "audience" ? (value as AppAudience) : app.audience,
      interactionType:
        field === "interactionType"
          ? (value as AppInteractionType)
          : app.interactionType,
      subjects: field === "subject" ? undefined : app.subjects,
      gradeBands: field === "grade" ? undefined : app.gradeBands
    };
    const metadata = normalizeAppMetadata(nextSource);

    updates.push({
      id,
      input: {
        title: app.title,
        summary: app.summary,
        url: app.url,
        githubUrl: app.githubUrl,
        tags: app.tags,
        thumbnailMode: app.thumbnailMode,
        thumbnailUrl: app.thumbnailUrl ?? undefined,
        subject: nextSource.subject,
        grade: nextSource.grade,
        memo: app.memo,
        subjects: metadata.subjects,
        gradeBands: metadata.gradeBands,
        audience: metadata.audience,
        interactionType: metadata.interactionType,
        learningProcess: metadata.learningProcess
      }
    });
  }

  for (const update of updates) {
    await repo.updateApp(update.id, update.input);
  }

  revalidateAdmin();
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
