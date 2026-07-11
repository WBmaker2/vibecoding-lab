import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { verifyPasswordHash } from "./password";

export const ADMIN_SESSION_COOKIE = "hvc_admin_session";

function getAdminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH ?? "";
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET ?? "";
  return secret.length >= 32 ? secret : null;
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function verifyAdminPassword(input: string) {
  const storedHash = getAdminPasswordHash();

  if (!storedHash) {
    return false;
  }

  return verifyPasswordHash(input, storedHash);
}

export function createAdminSessionToken() {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }

  return hashValue(`admin:${secret}`);
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const expectedToken = (() => {
    try {
      return createAdminSessionToken();
    } catch {
      return null;
    }
  })();

  if (!token || !expectedToken) {
    return false;
  }

  const actual = Buffer.from(token);
  const expected = Buffer.from(expectedToken);

  return (
    actual.length === expected.length && timingSafeEqual(actual, expected)
  );
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
