import type { AppInput, AppRecord } from "./types";

export interface AppRepository {
  listPublicApps(): Promise<AppRecord[]>;
  listAdminApps(): Promise<AppRecord[]>;
  createApp(input: AppInput): Promise<AppRecord>;
  updateApp(id: string, input: AppInput): Promise<AppRecord>;
  deleteApp(id: string): Promise<void>;
}

class PendingAppRepository implements AppRepository {
  private error(): never {
    throw new Error("App repository implementation is not wired yet.");
  }

  async listPublicApps(): Promise<AppRecord[]> {
    this.error();
  }

  async listAdminApps(): Promise<AppRecord[]> {
    this.error();
  }

  async createApp(input: AppInput): Promise<AppRecord> {
    void input;
    this.error();
  }

  async updateApp(id: string, input: AppInput): Promise<AppRecord> {
    void id;
    void input;
    this.error();
  }

  async deleteApp(id: string): Promise<void> {
    void id;
    this.error();
  }
}

export function getAppRepository(): AppRepository {
  return new PendingAppRepository();
}
