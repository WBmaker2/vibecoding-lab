import { describe, expect, it } from "vitest";
import { createPasswordHash, verifyPasswordHash } from "./password";

describe("password hashing", () => {
  it("verifies a password against its scrypt hash", () => {
    const hash = createPasswordHash("very-secret-password", "fixedsalt");

    expect(verifyPasswordHash("very-secret-password", hash)).toBe(true);
    expect(verifyPasswordHash("wrong-password", hash)).toBe(false);
  });

  it("rejects malformed password hashes", () => {
    expect(verifyPasswordHash("anything", "invalid")).toBe(false);
  });
});
