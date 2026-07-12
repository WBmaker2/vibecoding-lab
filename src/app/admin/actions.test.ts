import { beforeEach, describe, expect, it, vi } from "vitest";
import {
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
      listAdminApps: vi.fn(),
      removeTag: vi.fn(),
      updateApp: vi.fn()
    });
  });

  it.each([
    ["create", createAppAction],
    ["update", updateAppAction],
    ["delete", deleteAppAction],
    ["remove tag", removeAppTagAction]
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
});
