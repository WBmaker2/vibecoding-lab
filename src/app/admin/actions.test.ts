import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bulkUpdateClassificationAction,
  bulkUpdateTagsAction,
  createAppAction,
  deleteAppAction,
  removeAppTagAction,
  updateAppAction
} from "./actions";

const mocks = vi.hoisted(() => ({
  clearAdminSession: vi.fn(),
  getAppRepository: vi.fn(),
  hasAdminSession: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  resolveThumbnailInput: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  clearAdminSession: mocks.clearAdminSession,
  hasAdminSession: mocks.hasAdminSession
}));

vi.mock("@/lib/apps/repository", () => ({
  getAppRepository: mocks.getAppRepository
}));

vi.mock("@/lib/storage/thumbnails", () => ({
  resolveThumbnailInput: mocks.resolveThumbnailInput
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

describe("admin mutation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasAdminSession.mockResolvedValue(false);
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
    mocks.getAppRepository.mockReturnValue({
      createApp: vi.fn(),
      deleteApp: vi.fn(),
      getApp: vi.fn(),
      listAdminApps: vi.fn(),
      removeTag: vi.fn(),
      updateTags: vi.fn(),
      updateApp: vi.fn()
    });
  });

  it.each([
    ["create", createAppAction],
    ["update", updateAppAction],
    ["delete", deleteAppAction],
    ["remove tag", removeAppTagAction],
    ["bulk tags", bulkUpdateTagsAction],
    ["bulk classification", bulkUpdateClassificationAction]
  ] as const)(
    "redirects unauthenticated %s calls before repository or input work",
    async (_name, action) => {
      await expect(action(new FormData())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/login"
      );

      expect(mocks.hasAdminSession).toHaveBeenCalledTimes(1);
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
      expect(mocks.getAppRepository).not.toHaveBeenCalled();
      expect(mocks.resolveThumbnailInput).not.toHaveBeenCalled();
    }
  );

  it("updates a normalized tag across the selected apps", async () => {
    mocks.hasAdminSession.mockResolvedValue(true);
    const getApp = vi
      .fn()
      .mockResolvedValueOnce({ id: "app-1", tags: ["영어"] })
      .mockResolvedValueOnce({ id: "app-2", tags: ["과학", "실험"] });
    const updateTags = vi.fn().mockResolvedValue(undefined);
    mocks.getAppRepository.mockReturnValue({ getApp, updateTags });

    const formData = new FormData();
    formData.set("ids", "app-1,app-2,app-1");
    formData.set("mode", "add");
    formData.set("tag", "#수업");

    await bulkUpdateTagsAction(formData);

    expect(updateTags).toHaveBeenNthCalledWith(1, "app-1", ["영어", "수업"]);
    expect(updateTags).toHaveBeenNthCalledWith(2, "app-2", ["과학", "실험", "수업"]);
    expect(updateTags).toHaveBeenCalledTimes(2);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("rejects removing the last tag before changing any selected app", async () => {
    mocks.hasAdminSession.mockResolvedValue(true);
    const getApp = vi.fn().mockResolvedValue({ id: "app-1", tags: ["수업"] });
    const updateTags = vi.fn();
    mocks.getAppRepository.mockReturnValue({ getApp, updateTags });

    const formData = new FormData();
    formData.set("ids", "app-1");
    formData.set("mode", "remove");
    formData.set("tag", "수업");

    await expect(bulkUpdateTagsAction(formData)).rejects.toThrow(
      "마지막 태그는 일괄 삭제할 수 없습니다."
    );
    expect(updateTags).not.toHaveBeenCalled();
  });

  it("updates a normalized classification across the selected apps", async () => {
    mocks.hasAdminSession.mockResolvedValue(true);
    const getApp = vi.fn().mockResolvedValue({
      id: "app-1",
      title: "실험 도구",
      summary: "과학 수업",
      url: "https://example.com/science",
      githubUrl: undefined,
      tags: ["과학"],
      thumbnailMode: "placeholder",
      thumbnailUrl: null,
      subject: "사회",
      grade: "초등 3학년",
      memo: "",
      subjects: ["사회"],
      gradeBands: ["3-4"],
      audience: "student",
      interactionType: "practice",
      learningProcess: ["문제 해결"],
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      updatedAt: new Date("2026-04-05T00:00:00.000Z")
    });
    const updateApp = vi.fn().mockResolvedValue(undefined);
    mocks.getAppRepository.mockReturnValue({ getApp, updateApp });

    const formData = new FormData();
    formData.set("ids", "app-1");
    formData.set("field", "subject");
    formData.set("value", "바른 생활");

    await bulkUpdateClassificationAction(formData);

    expect(updateApp).toHaveBeenCalledWith(
      "app-1",
      expect.objectContaining({
        subject: "바른 생활",
        subjects: ["바른생활"],
        gradeBands: ["3-4"]
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("rejects invalid bulk classification values before updates", async () => {
    mocks.hasAdminSession.mockResolvedValue(true);
    const getApp = vi.fn();
    const updateApp = vi.fn();
    mocks.getAppRepository.mockReturnValue({ getApp, updateApp });

    const formData = new FormData();
    formData.set("ids", "app-1");
    formData.set("field", "audience");
    formData.set("value", "unknown");

    await expect(bulkUpdateClassificationAction(formData)).rejects.toThrow(
      "사용자 분류 값이 올바르지 않습니다."
    );
    expect(getApp).not.toHaveBeenCalled();
    expect(updateApp).not.toHaveBeenCalled();
  });
});
