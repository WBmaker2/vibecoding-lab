type SearchableApp = {
  title: string;
  summary: string;
  tags: string[];
  subject?: string;
  grade?: string;
  memo?: string;
};

export function filterApps<T extends SearchableApp>(
  apps: T[],
  query: string,
  activeTags: string[]
) {
  const normalizedQuery = query.trim().toLowerCase();

  return apps.filter((app) => {
    const haystack = [
      app.title,
      app.summary,
      ...app.tags,
      app.subject ?? "",
      app.grade ?? "",
      app.memo ?? ""
    ]
      .join(" ")
      .toLowerCase();

    const queryMatch =
      normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
    const tagMatch = activeTags.every((tag) => app.tags.includes(tag));

    return queryMatch && tagMatch;
  });
}
