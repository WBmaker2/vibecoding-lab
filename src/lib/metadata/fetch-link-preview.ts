function extractTagContent(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function extractAttribute(tag: string, attribute: string) {
  const pattern = new RegExp(`${attribute}=["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1]?.trim() ?? null;
}

function extractLinkHref(html: string, matcher: (rel: string) => boolean) {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];

  for (const tag of linkTags) {
    const rel = extractAttribute(tag, "rel");
    const href = extractAttribute(tag, "href");

    if (!rel || !href) {
      continue;
    }

    if (matcher(rel.toLowerCase())) {
      return href;
    }
  }

  return null;
}

function toAbsoluteUrl(url: string | null, sourceUrl?: string) {
  if (!url) {
    return null;
  }

  if (!sourceUrl) {
    return url;
  }

  try {
    return new URL(url, sourceUrl).toString();
  } catch {
    return url;
  }
}

export function extractPreviewFromHtml(html: string, sourceUrl?: string) {
  const title =
    extractTagContent(html, /<title[^>]*>([^<]+)<\/title>/i) ?? "Untitled";
  const description =
    extractTagContent(
      html,
      /<meta[^>]+(?:name|property)=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
    ) ??
    extractTagContent(
      html,
      /<meta[^>]+(?:property|name)=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i
    );
  const imageUrl =
    extractTagContent(
      html,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
    ) ??
    extractTagContent(
      html,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
    ) ??
    extractLinkHref(html, (rel) => rel.includes("apple-touch-icon")) ??
    extractLinkHref(html, (rel) => rel.split(/\s+/).includes("icon"));

  return {
    title,
    description,
    imageUrl: toAbsoluteUrl(imageUrl, sourceUrl)
  };
}

export async function fetchLinkPreview(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; HongsVibeCodingLabBot/1.0; +https://example.com)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch preview: ${response.status}`);
  }

  const html = await response.text();
  return extractPreviewFromHtml(html, url);
}
