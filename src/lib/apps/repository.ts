import { desc, eq, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db/client";
import { appCatalogState, apps } from "@/db/schema";
import { getDatabaseProvider } from "@/lib/env";
import { TursoAppRepository } from "./turso-repository";
import {
  toAdminAppRecord,
  toPublicAppRecord
} from "./record-mappers";
import type { AdminAppRecord, AppInput, PublicAppRecord } from "./types";

export { toAdminAppRecord, toPublicAppRecord } from "./record-mappers";

export interface AppRepository {
  listPublicApps(): Promise<PublicAppRecord[]>;
  listAdminApps(): Promise<AdminAppRecord[]>;
  getCatalogRevision?(): Promise<number>;
  getApp(id: string): Promise<AdminAppRecord | null>;
  createApp(input: AppInput): Promise<AdminAppRecord>;
  updateApp(id: string, input: AppInput): Promise<AdminAppRecord>;
  removeTag(id: string, tag: string): Promise<AdminAppRecord>;
  deleteApp(id: string): Promise<void>;
}

function createSeedApps(): AdminAppRecord[] {
  const now = new Date("2026-04-05T00:00:00.000Z");

  return [
    {
      id: crypto.randomUUID(),
      title: "Talking Vocab Quiz",
      summary: "음성과 퀴즈 흐름으로 단어를 빠르게 복습하는 영어 수업 도구",
      url: "https://example.com/talking-vocab-quiz",
      githubUrl: undefined,
      tags: ["영어", "게임형", "형성평가"],
      thumbnailMode: "placeholder",
      thumbnailUrl: null,
      subject: "영어",
      grade: "초등 4학년",
      memo: "짧은 복습 시간에 바로 투입하기 좋습니다.",
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      title: "Class Random Seat",
      summary: "교실 자리 배치를 빠르게 정하고 즉시 화면 공유할 수 있는 운영 도구",
      url: "https://example.com/class-random-seat",
      githubUrl: undefined,
      tags: ["학급경영", "업무경감", "랜덤"],
      thumbnailMode: "placeholder",
      thumbnailUrl: null,
      subject: "창체",
      grade: "전학년",
      memo: "학생 참여를 끊지 않고 자리 배치를 마무리할 수 있습니다.",
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      title: "Worksheet Toolkit",
      summary: "활동지 제작 부담을 줄여주는 교사용 수업 준비 보조 도구",
      url: "https://example.com/worksheet-toolkit",
      githubUrl: undefined,
      tags: ["업무경감", "수업준비"],
      thumbnailMode: "placeholder",
      thumbnailUrl: null,
      subject: "공통",
      grade: "전학년",
      memo: "",
      createdAt: now,
      updatedAt: now
    }
  ];
}

const memoryStore = {
  apps: createSeedApps(),
  catalogRevision: 0
};

class InMemoryAppRepository implements AppRepository {
  async listPublicApps(): Promise<PublicAppRecord[]> {
    return memoryStore.apps.map(toPublicAppRecord);
  }

  async listAdminApps(): Promise<AdminAppRecord[]> {
    return memoryStore.apps.map(toAdminAppRecord);
  }

  async getApp(id: string): Promise<AdminAppRecord | null> {
    const record = memoryStore.apps.find((app) => app.id === id);
    return record ? toAdminAppRecord(record) : null;
  }

  async createApp(input: AppInput): Promise<AdminAppRecord> {
    const now = new Date();
    const record: AdminAppRecord = {
      id: crypto.randomUUID(),
      title: input.title,
      summary: input.summary,
      url: input.url,
      githubUrl: input.githubUrl || undefined,
      tags: input.tags,
      thumbnailMode: input.thumbnailMode,
      thumbnailUrl: input.thumbnailUrl ?? null,
      subject: input.subject || undefined,
      grade: input.grade || undefined,
      memo: input.memo || undefined,
      subjects: input.subjects,
      gradeBands: input.gradeBands,
      audience: input.audience,
      interactionType: input.interactionType,
      learningProcess: input.learningProcess,
      createdAt: now,
      updatedAt: now
    };

    memoryStore.apps = [record, ...memoryStore.apps];
    memoryStore.catalogRevision += 1;
    return record;
  }

  async updateApp(id: string, input: AppInput): Promise<AdminAppRecord> {
    const existing = memoryStore.apps.find((app) => app.id === id);

    if (!existing) {
      throw new Error("App not found.");
    }

    const updated: AdminAppRecord = {
      ...existing,
      title: input.title,
      summary: input.summary,
      url: input.url,
      githubUrl: input.githubUrl || undefined,
      tags: input.tags,
      thumbnailMode: input.thumbnailMode,
      thumbnailUrl: input.thumbnailUrl ?? null,
      subject: input.subject || undefined,
      grade: input.grade || undefined,
      memo: input.memo || undefined,
      subjects: input.subjects,
      gradeBands: input.gradeBands,
      audience: input.audience,
      interactionType: input.interactionType,
      learningProcess: input.learningProcess,
      updatedAt: new Date()
    };

    memoryStore.apps = memoryStore.apps.map((app) =>
      app.id === id ? updated : app
    );
    memoryStore.catalogRevision += 1;

    return updated;
  }

  async deleteApp(id: string): Promise<void> {
    const hadApp = memoryStore.apps.some((app) => app.id === id);
    memoryStore.apps = memoryStore.apps.filter((app) => app.id !== id);
    if (hadApp) memoryStore.catalogRevision += 1;
  }

  async removeTag(id: string, tag: string): Promise<AdminAppRecord> {
    const existing = memoryStore.apps.find((app) => app.id === id);

    if (!existing) {
      throw new Error("App not found.");
    }

    if (existing.tags.length <= 1) {
      throw new Error("앱에는 태그가 최소 1개 필요합니다.");
    }

    const nextTags = existing.tags.filter((item) => item !== tag);

    if (nextTags.length === existing.tags.length) {
      return existing;
    }

    const updated: AdminAppRecord = {
      ...existing,
      tags: nextTags,
      updatedAt: new Date()
    };

    memoryStore.apps = memoryStore.apps.map((app) =>
      app.id === id ? updated : app
    );
    memoryStore.catalogRevision += 1;

    return updated;
  }

  async getCatalogRevision(): Promise<number> {
    return memoryStore.catalogRevision;
  }
}

class PostgresAppRepository implements AppRepository {
  private async ensureCatalogState(db: ReturnType<typeof getDb>) {
    await db
      .insert(appCatalogState)
      .values({ stateKey: "apps", revision: 0 })
      .onConflictDoNothing();
  }

  private async bumpCatalogRevision(db: ReturnType<typeof getDb>) {
    try {
      await this.ensureCatalogState(db);
      await db
        .update(appCatalogState)
        .set({ revision: sql`${appCatalogState.revision} + 1` })
        .where(eq(appCatalogState.stateKey, "apps"));
    } catch (error) {
      console.warn(
        "Postgres catalog revision was not updated; sync will use the full comparison fallback.",
        error
      );
    }
  }

  async getCatalogRevision(): Promise<number> {
    const db = getDb();
    const [state] = await db
      .select({ revision: appCatalogState.revision })
      .from(appCatalogState)
      .where(eq(appCatalogState.stateKey, "apps"))
      .limit(1);
    const revision = Number(state?.revision);

    if (!Number.isSafeInteger(revision) || revision < 0) {
      throw new Error("Postgres app catalog revision is invalid.");
    }

    return revision;
  }

  async listPublicApps(): Promise<PublicAppRecord[]> {
    const db = getDb();
    const records = await db
      .select()
      .from(apps)
      .orderBy(desc(apps.updatedAt), desc(apps.createdAt));

    return records.map(toPublicAppRecord);
  }

  async listAdminApps(): Promise<AdminAppRecord[]> {
    const db = getDb();
    const records = await db
      .select()
      .from(apps)
      .orderBy(desc(apps.updatedAt), desc(apps.createdAt));

    return records.map(toAdminAppRecord);
  }

  async getApp(id: string): Promise<AdminAppRecord | null> {
    const db = getDb();
    const [record] = await db.select().from(apps).where(eq(apps.id, id));

    return record ? toAdminAppRecord(record) : null;
  }

  async createApp(input: AppInput): Promise<AdminAppRecord> {
    const db = getDb();
    const [record] = await db
      .insert(apps)
      .values({
        title: input.title,
        summary: input.summary,
        url: input.url,
        githubUrl: input.githubUrl ?? null,
        tags: input.tags,
        thumbnailMode: input.thumbnailMode,
        thumbnailUrl: input.thumbnailUrl ?? null,
        subject: input.subject ?? null,
        grade: input.grade ?? null,
        memo: input.memo ?? null,
        subjects: input.subjects ?? [],
        gradeBands: input.gradeBands ?? [],
        audience: input.audience ?? null,
        interactionType: input.interactionType ?? null,
        learningProcess: input.learningProcess ?? []
      })
      .returning();

    await this.bumpCatalogRevision(db);
    return toAdminAppRecord(record);
  }

  async updateApp(id: string, input: AppInput): Promise<AdminAppRecord> {
    const db = getDb();
    const [record] = await db
      .update(apps)
      .set({
        title: input.title,
        summary: input.summary,
        url: input.url,
        githubUrl: input.githubUrl ?? null,
        tags: input.tags,
        thumbnailMode: input.thumbnailMode,
        thumbnailUrl: input.thumbnailUrl ?? null,
        subject: input.subject ?? null,
        grade: input.grade ?? null,
        memo: input.memo ?? null,
        updatedAt: new Date()
      })
      .where(eq(apps.id, id))
      .returning();

    if (!record) {
      throw new Error("App not found.");
    }

    await this.bumpCatalogRevision(db);
    return toAdminAppRecord(record);
  }

  async deleteApp(id: string): Promise<void> {
    const db = getDb();
    const result = await db
      .delete(apps)
      .where(eq(apps.id, id))
      .returning({ id: apps.id });
    if (result.length > 0) {
      await this.bumpCatalogRevision(db);
    }
  }

  async removeTag(id: string, tag: string): Promise<AdminAppRecord> {
    const db = getDb();
    const [existing] = await db.select().from(apps).where(eq(apps.id, id));

    if (!existing) {
      throw new Error("App not found.");
    }

    if (existing.tags.length <= 1) {
      throw new Error("앱에는 태그가 최소 1개 필요합니다.");
    }

    const nextTags = existing.tags.filter((item) => item !== tag);

    if (nextTags.length === existing.tags.length) {
      return toAdminAppRecord(existing);
    }

    const [record] = await db
      .update(apps)
      .set({
        tags: nextTags,
        updatedAt: new Date()
      })
      .where(eq(apps.id, id))
      .returning();

    if (!record) {
      throw new Error("App not found.");
    }

    await this.bumpCatalogRevision(db);
    return toAdminAppRecord(record);
  }
}

export function getAppRepository(): AppRepository {
  if (getDatabaseProvider() === "turso") {
    return new TursoAppRepository();
  }

  if (isDatabaseConfigured() && getDatabaseProvider() === "postgres") {
    return new PostgresAppRepository();
  }

  return new InMemoryAppRepository();
}
