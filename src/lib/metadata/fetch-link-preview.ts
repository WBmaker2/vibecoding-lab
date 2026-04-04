function extractTagContent(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? null;
}

export function extractPreviewFromHtml(html: string) {
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
    );

  return {
    title,
    description,
    imageUrl
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
  return extractPreviewFromHtml(html);
}
