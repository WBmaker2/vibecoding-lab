export function normalizeTag(tag: string) {
  return tag.trim().replace(/^#+/, "").trim();
}

export function normalizeTags(tags: string[]) {
  const normalizedTags: string[] = [];

  for (const tag of tags) {
    const normalizedTag = normalizeTag(tag);

    if (!normalizedTag || normalizedTags.includes(normalizedTag)) {
      continue;
    }

    normalizedTags.push(normalizedTag);
  }

  return normalizedTags;
}
