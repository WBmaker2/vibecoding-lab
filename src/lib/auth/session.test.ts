import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  verifyAdminPassword
} from "./session";
import { createPasswordHash } from "./password";

describe("session helpers", () => {
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
});
