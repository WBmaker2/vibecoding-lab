import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { verifyPasswordHash } from "./password";

export const ADMIN_SESSION_COOKIE = "hvc_admin_session";

function getAdminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH ?? "";
}

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "0123456789abcdef0123456789abcdef";
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
  return hashValue(`admin:${getSessionSecret()}`);
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return token === createAdminSessionToken();
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
