import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminPageData } from "@/lib/apps/admin-page-data";

const mocks = vi.hoisted(() => ({
  hasAdminSession: vi.fn(),
  loadAdminPageData: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  hasAdminSession: mocks.hasAdminSession
}));

vi.mock("@/lib/apps/admin-page-data", () => ({
  loadAdminPageData: mocks.loadAdminPageData
}));

vi.mock("@/features/admin/admin-shell", () => ({
  AdminShell: () => <div>database admin shell</div>
}));

vi.mock("@/features/admin/admin-database-fallback", () => ({
  AdminDatabaseFallback: ({ reason }: { reason: string }) => (
    <div>fallback: {reason}</div>
  )
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

import AdminPage from "./page";

const fallbackData: AdminPageData = {
  apps: [],
  baseline: {
    generatedAt: "2026-08-09T00:00:00.000Z",
    appCount: 0,
    updatedAtById: {}
  },
  assetIntegrity: {
    valid: true,
    reason: "assets-match"
  },
  dataSource: {
    kind: "static-fallback",
    reason: "DB quota exceeded"
  }
};

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`redirect:${url}`);
    });
  });

  it("redirects unauthenticated visitors before reading the database", async () => {
    mocks.hasAdminSession.mockResolvedValue(false);

    await expect(AdminPage()).rejects.toThrow("redirect:/admin/login");

    expect(mocks.loadAdminPageData).not.toHaveBeenCalled();
  });

  it("renders the read-only fallback after an authenticated database failure", async () => {
    mocks.hasAdminSession.mockResolvedValue(true);
    mocks.loadAdminPageData.mockResolvedValue(fallbackData);

    render(await AdminPage());

    expect(screen.getByText("fallback: DB quota exceeded")).toBeInTheDocument();
  });
});
