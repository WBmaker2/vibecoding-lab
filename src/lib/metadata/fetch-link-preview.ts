import { fetchSafeHtml } from "@/lib/security/remote-url";

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

  try {
    const absoluteUrl = sourceUrl ? new URL(url, sourceUrl) : new URL(url);

    if (
      absoluteUrl.protocol !== "http:" &&
      absoluteUrl.protocol !== "https:"
    ) {
      return null;
    }

    return absoluteUrl.toString();
  } catch {
    return null;
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
  const response = await fetchSafeHtml(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; HongsVibeCodingLabBot/1.0; +https://example.com)"
    }
  });

  return extractPreviewFromHtml(response.html, response.finalUrl);
}
