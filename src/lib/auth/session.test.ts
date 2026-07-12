import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  hasAdminSession,
  setAdminSession,
  verifyAdminPassword
} from "./session";
import { createPasswordHash } from "./password";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  cookieStore: {
    delete: vi.fn(),
    get: vi.fn(),
    set: vi.fn()
  }
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies
}));

describe("session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue(mocks.cookieStore);
    delete process.env.SESSION_SECRET;
  });

  it("accepts the configured password", async () => {
    process.env.ADMIN_PASSWORD_HASH = createPasswordHash(
      "very-secret-password",
      "fixedsalt"
    );

    await expect(
      verifyAdminPassword("very-secret-password")
    ).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    process.env.ADMIN_PASSWORD_HASH = createPasswordHash(
      "very-secret-password",
      "fixedsalt"
    );

    await expect(verifyAdminPassword("wrong-password")).resolves.toBe(false);
  });

  it("creates a stable admin session token", () => {
    process.env.SESSION_SECRET = "0123456789abcdef0123456789abcdef";

    expect(ADMIN_SESSION_COOKIE).toBe("hvc_admin_session");
    expect(createAdminSessionToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([undefined, "too-short"]) (
    "fails closed when SESSION_SECRET is %s",
    async (secret) => {
      if (secret === undefined) {
        delete process.env.SESSION_SECRET;
      } else {
        process.env.SESSION_SECRET = secret;
      }

      mocks.cookieStore.get.mockReturnValue({
        value: "invalid-session-token"
      });

      await expect(hasAdminSession()).resolves.toBe(false);
      expect(() => createAdminSessionToken()).toThrow(
        "SESSION_SECRET must be at least 32 characters."
      );
      await expect(setAdminSession()).rejects.toThrow(
        "SESSION_SECRET must be at least 32 characters."
      );
      expect(mocks.cookieStore.set).not.toHaveBeenCalled();
    }
  );

  it("accepts only the exact valid session token", async () => {
    process.env.SESSION_SECRET = "0123456789abcdef0123456789abcdef";
    const validToken = createAdminSessionToken();

    mocks.cookieStore.get.mockReturnValue({ value: validToken });
    await expect(hasAdminSession()).resolves.toBe(true);

    mocks.cookieStore.get.mockReturnValue({ value: `${validToken}x` });
    await expect(hasAdminSession()).resolves.toBe(false);

    mocks.cookieStore.get.mockReturnValue({ value: validToken.slice(0, 8) });
    await expect(hasAdminSession()).resolves.toBe(false);
  });

  it.each([
    [31, false],
    [32, true]
  ])("honors the %s-character session secret boundary", (length, valid) => {
    process.env.SESSION_SECRET = "s".repeat(length);

    if (valid) {
      expect(createAdminSessionToken()).toMatch(/^[a-f0-9]{64}$/);
    } else {
      expect(() => createAdminSessionToken()).toThrow(
        "SESSION_SECRET must be at least 32 characters."
      );
    }
  });
});
