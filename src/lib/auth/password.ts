import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_HASH_PREFIX = "scrypt";
const DEFAULT_KEY_LENGTH = 64;

function normalizeSecret(value: string) {
  return value.normalize("NFKC");
}

export function createPasswordHash(password: string, salt = randomBytes(16).toString("hex")) {
  const derivedKey = scryptSync(
    normalizeSecret(password),
    salt,
    DEFAULT_KEY_LENGTH
  ).toString("hex");

  return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey}`;
}

export function verifyPasswordHash(password: string, storedHash: string) {
  const [algorithm, salt, derivedKeyHex] = storedHash.split(":");

  if (algorithm !== PASSWORD_HASH_PREFIX || !salt || !derivedKeyHex) {
    return false;
  }

  const expected = Buffer.from(derivedKeyHex, "hex");
  const provided = scryptSync(
    normalizeSecret(password),
    salt,
    expected.length
  );

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}
