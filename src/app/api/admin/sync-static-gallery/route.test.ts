import { beforeEach, describe, expect, it, vi } from "vitest";

const { hasAdminSessionMock } = vi.hoisted(() => ({
  hasAdminSessionMock: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  hasAdminSession: hasAdminSessionMock
}));

import { POST } from "./route";

const originalEnv = { ...process.env };

describe("POST /api/admin/sync-static-gallery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hasAdminSessionMock.mockReset();
    process.env = { ...originalEnv };
    delete process.env.HVC_SYNC_GITHUB_TOKEN;
    delete process.env.HVC_SYNC_GITHUB_OWNER;
    delete process.env.HVC_SYNC_GITHUB_REPO;
    delete process.env.HVC_SYNC_GITHUB_WORKFLOW_ID;
    delete process.env.HVC_SYNC_GITHUB_REF;
    delete process.env.HVC_SYNC_BASE_URL;
  });

  it("rejects unauthenticated requests", async () => {
    hasAdminSessionMock.mockResolvedValue(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await POST(
      new Request("http://localhost/api/admin/sync-static-gallery", {
        method: "POST"
      })
    );

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a configuration error when the GitHub token is missing", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await POST(
      new Request("http://localhost/api/admin/sync-static-gallery", {
        method: "POST"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("HVC_SYNC_GITHUB_TOKEN");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("dispatches the static gallery workflow with defaults", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    const response = await POST(
      new Request("http://localhost/api/admin/sync-static-gallery", {
        method: "POST",
        body: JSON.stringify({ reason: "button click" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      workflow: "sync-static-gallery.yml",
      ref: "codex/hongs-vibe-coding-lab"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/WBmaker2/vibecoding-lab/actions/workflows/sync-static-gallery.yml/dispatches",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-token"
        }),
        body: JSON.stringify({
          ref: "codex/hongs-vibe-coding-lab",
          inputs: {
            base_url: "https://www.vivehong.shop",
            reason: "button click"
          }
        })
      })
    );
  });

  it("uses explicit repository and workflow configuration when provided", async () => {
    hasAdminSessionMock.mockResolvedValue(true);
    process.env.HVC_SYNC_GITHUB_TOKEN = "test-token";
    process.env.HVC_SYNC_GITHUB_OWNER = "ExampleOwner";
    process.env.HVC_SYNC_GITHUB_REPO = "example-repo";
    process.env.HVC_SYNC_GITHUB_WORKFLOW_ID = "custom-sync.yml";
    process.env.HVC_SYNC_GITHUB_REF = "main";
    process.env.HVC_SYNC_BASE_URL = "https://example.com";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    const response = await POST(
      new Request("http://localhost/api/admin/sync-static-gallery", {
        method: "POST"
      })
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/ExampleOwner/example-repo/actions/workflows/custom-sync.yml/dispatches",
      expect.objectContaining({
        body: JSON.stringify({
          ref: "main",
          inputs: {
            base_url: "https://example.com",
            reason: "admin-button"
          }
        })
      })
    );
  });
});
