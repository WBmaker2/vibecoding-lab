import { desc, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db/client";
import { apps } from "@/db/schema";
import type { AppInput, AppRecord } from "./types";

export interface AppRepository {
  listPublicApps(): Promise<AppRecord[]>;
  listAdminApps(): Promise<AppRecord[]>;
  createApp(input: AppInput): Promise<AppRecord>;
  updateApp(id: string, input: AppInput): Promise<AppRecord>;
  deleteApp(id: string): Promise<void>;
}

function createSeedApps(): AppRecord[] {
  const now = new Date("2026-04-05T00:00:00.000Z");

  return [
    {
      id: crypto.randomUUID(),
      title: "Talking Vocab Quiz",
      summary: "음성과 퀴즈 흐름으로 단어를 빠르게 복습하는 영어 수업 도구",
      url: "https://example.com/talking-vocab-quiz",
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
  apps: createSeedApps()
};

function toAppRecord(record: typeof apps.$inferSelect): AppRecord {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    url: record.url,
    tags: record.tags,
    thumbnailMode: record.thumbnailMode as AppRecord["thumbnailMode"],
    thumbnailUrl: record.thumbnailUrl,
    subject: record.subject ?? undefined,
    grade: record.grade ?? undefined,
    memo: record.memo ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

class InMemoryAppRepository implements AppRepository {
  async listPublicApps(): Promise<AppRecord[]> {
    return [...memoryStore.apps];
  }

  async listAdminApps(): Promise<AppRecord[]> {
    return [...memoryStore.apps];
  }

  async createApp(input: AppInput): Promise<AppRecord> {
    const now = new Date();
    const record: AppRecord = {
      id: crypto.randomUUID(),
      title: input.title,
      summary: input.summary,
      url: input.url,
      tags: input.tags,
      thumbnailMode: input.thumbnailMode,
      thumbnailUrl: input.thumbnailUrl ?? null,
      subject: input.subject || undefined,
      grade: input.grade || undefined,
      memo: input.memo || undefined,
      createdAt: now,
      updatedAt: now
    };

    memoryStore.apps = [record, ...memoryStore.apps];
    return record;
  }

  async updateApp(id: string, input: AppInput): Promise<AppRecord> {
    const existing = memoryStore.apps.find((app) => app.id === id);

    if (!existing) {
      throw new Error("App not found.");
    }

    const updated: AppRecord = {
      ...existing,
      title: input.title,
      summary: input.summary,
      url: input.url,
      tags: input.tags,
      thumbnailMode: input.thumbnailMode,
      thumbnailUrl: input.thumbnailUrl ?? null,
      subject: input.subject || undefined,
      grade: input.grade || undefined,
      memo: input.memo || undefined,
      updatedAt: new Date()
    };

    memoryStore.apps = memoryStore.apps.map((app) =>
      app.id === id ? updated : app
    );

    return updated;
  }

  async deleteApp(id: string): Promise<void> {
    memoryStore.apps = memoryStore.apps.filter((app) => app.id !== id);
  }
}

class PostgresAppRepository implements AppRepository {
  async listPublicApps(): Promise<AppRecord[]> {
    const db = getDb();
    const records = await db
      .select()
      .from(apps)
      .orderBy(desc(apps.updatedAt), desc(apps.createdAt));

    return records.map(toAppRecord);
  }

  async listAdminApps(): Promise<AppRecord[]> {
    return this.listPublicApps();
  }

  async createApp(input: AppInput): Promise<AppRecord> {
    const db = getDb();
    const [record] = await db
      .insert(apps)
      .values({
        title: input.title,
        summary: input.summary,
        url: input.url,
        tags: input.tags,
        thumbnailMode: input.thumbnailMode,
        thumbnailUrl: input.thumbnailUrl ?? null,
        subject: input.subject ?? null,
        grade: input.grade ?? null,
        memo: input.memo ?? null
      })
      .returning();

    return toAppRecord(record);
  }

  async updateApp(id: string, input: AppInput): Promise<AppRecord> {
    const db = getDb();
    const [record] = await db
      .update(apps)
      .set({
        title: input.title,
        summary: input.summary,
        url: input.url,
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

    return toAppRecord(record);
  }

  async deleteApp(id: string): Promise<void> {
    const db = getDb();
    await db.delete(apps).where(eq(apps.id, id));
  }
}

export function getAppRepository(): AppRepository {
  if (isDatabaseConfigured()) {
    return new PostgresAppRepository();
  }

  return new InMemoryAppRepository();
}
