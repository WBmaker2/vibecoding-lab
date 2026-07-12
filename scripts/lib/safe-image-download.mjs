import { fetchSafeResource } from "../../src/lib/security/remote-url.mjs";
import {
  MAX_IMAGE_BYTES,
  validateImageBytes
} from "../../src/lib/security/image-policy.mjs";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_REDIRECTS = 3;

function getContentType(headers) {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  return headers["content-type"] ?? headers["Content-Type"] ?? null;
}

export async function fetchSafeImage(input, options = {}) {
  const transport = options.fetchResource ?? fetchSafeResource;
  const response = await transport(input, {
    headers: { "user-agent": "codex-export-static-gallery" },
    maxBytes: MAX_IMAGE_BYTES,
    maxRedirects: DEFAULT_MAX_REDIRECTS,
    method: "GET",
    timeoutMs: DEFAULT_TIMEOUT_MS
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Failed to fetch remote image: ${response.statusCode}`);
  }

  const contentType = getContentType(response.headers);
  const validated = validateImageBytes(contentType, response.body);

  return {
    body: Buffer.from(response.body),
    contentType: validated.contentType,
    extension: validated.extension,
    finalUrl: response.finalUrl
  };
}
