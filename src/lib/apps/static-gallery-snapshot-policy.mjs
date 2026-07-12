const CANONICAL_ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isCanonicalGeneratedAt(value) {
  if (typeof value !== "string" || !CANONICAL_ISO_TIMESTAMP.test(value)) {
    return false;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
