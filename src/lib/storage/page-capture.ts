import { put } from "@vercel/blob";
import {
  fetchSafeHtml,
  fetchSafeResource,
  type RemoteNetworkBudget
} from "@/lib/security/remote-url";

const CAPTURE_WIDTH = 1200;
const CAPTURE_HEIGHT = 630;
const CAPTURE_DELAY_MS = 1500;
const CAPTURE_TIMEOUT_MS = 15000;
const MAX_CAPTURE_REQUESTS = 80;
// Browser subresources are bounded to 512 KiB each before Chromium sees them.
const MAX_CAPTURE_RESOURCE_BYTES = 512 * 1024;

function getThumbnailHostLabel(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const SAFE_REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "referer",
  "user-agent"
]);

const SAFE_RESPONSE_HEADERS = new Set([
  "cache-control",
  "content-language",
  "content-type",
  "etag",
  "expires",
  "last-modified",
  "vary"
]);

function toPngDataUrl(buffer: Buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function storeCapturedImage(buffer: Buffer, sourceUrl: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (!token) {
    return toPngDataUrl(buffer);
  }

  const host = getThumbnailHostLabel(sourceUrl) ?? "web-app";
  const blob = await put(
    `thumbnails/${host}-${Date.now()}-capture.png`,
    new Blob([new Uint8Array(buffer)], { type: "image/png" }),
    {
      access: "public",
      token,
      contentType: "image/png"
    }
  );

  return blob.url;
}

async function launchChromium() {
  const { chromium } = await import("playwright-core");

  if (process.env.VERCEL) {
    const chromiumPackage = (await import("@sparticuz/chromium")).default;
    const executablePath = await chromiumPackage.executablePath();

    return chromium.launch({
      args: chromiumPackage.args,
      executablePath,
      headless: true
    });
  }

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();

  return chromium.launch({
    executablePath: executablePath || undefined,
    headless: true
  });
}

function withBaseHref(html: string, baseUrl: string) {
  const escapedUrl = baseUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
  const baseTag = `<base href="${escapedUrl}">`;

  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/(<head\b[^>]*>)/i, `$1${baseTag}`);
  }

  return `<head>${baseTag}</head>${html}`;
}

function getCaptureTarget(sourceUrl: string) {
  try {
    const target = new URL(sourceUrl);

    if (!["http:", "https:"].includes(target.protocol)) {
      return null;
    }

    target.hash = "";
    return target.toString();
  } catch {
    return null;
  }
}

function sanitizeRequestHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) =>
      SAFE_REQUEST_HEADERS.has(name.toLowerCase())
    )
  );
}

function sanitizeResponseHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) =>
      SAFE_RESPONSE_HEADERS.has(name.toLowerCase())
    )
  );
}

function disableBrowserEgress() {
  const blockedGlobals = [
    "WebTransport",
    "RTCPeerConnection",
    "webkitRTCPeerConnection",
    "Worker",
    "SharedWorker"
  ];

  for (const name of blockedGlobals) {
    try {
      Object.defineProperty(globalThis, name, {
        configurable: false,
        value: undefined,
        writable: false
      });
    } catch {
      try {
        (globalThis as unknown as Record<string, unknown>)[name] = undefined;
      } catch {
        // A non-configurable browser global is already outside this control path.
      }
    }
  }
}

export async function capturePageThumbnail(sourceUrl: string) {
  const target = getCaptureTarget(sourceUrl);

  if (!target) {
    return null;
  }

  const captureDeadline = Date.now() + CAPTURE_TIMEOUT_MS;
  const networkBudget: RemoteNetworkBudget = {
    remaining: MAX_CAPTURE_REQUESTS
  };
  const safeDocument = await fetchSafeHtml(target, {
    budget: networkBudget,
    deadline: captureDeadline,
    timeoutMs: CAPTURE_TIMEOUT_MS
  }).catch(() => null);

  if (!safeDocument) {
    return null;
  }

  const browser = await launchChromium().catch(() => null);

  if (!browser) {
    return null;
  }

  try {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: {
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT
      },
      javaScriptEnabled: true,
      serviceWorkers: "block"
    });
    let mainDocumentFulfilled = false;

    await context.routeWebSocket("**/*", (webSocket) => {
      webSocket.close();
    });
    await context.addInitScript(disableBrowserEgress);
    await context.route("**/*", async (route) => {
      const requestUrl = route.request().url();

      if (!mainDocumentFulfilled && requestUrl === target) {
        mainDocumentFulfilled = true;
        await route.fulfill({
          body: withBaseHref(safeDocument.html, safeDocument.finalUrl),
          contentType: "text/html; charset=utf-8",
          status: 200
        });
        return;
      }

      if (
        networkBudget.remaining <= 0 ||
        !/^https?:/i.test(requestUrl) ||
        !["GET", "HEAD"].includes(route.request().method())
      ) {
        await route.abort("blockedbyclient");
        return;
      }

      try {
        const resource = await fetchSafeResource(requestUrl, {
          budget: networkBudget,
          deadline: captureDeadline,
          headers: sanitizeRequestHeaders(
            await route.request().headers()
          ),
          maxBytes: MAX_CAPTURE_RESOURCE_BYTES,
          method: route.request().method() as "GET" | "HEAD"
        });

        await route.fulfill({
          body: resource.body,
          headers: sanitizeResponseHeaders(resource.headers),
          status: resource.statusCode
        });
      } catch {
        await route.abort("blockedbyclient");
      }
    });

    const page = await context.newPage();

    await page.goto(target, {
      timeout: Math.max(1, captureDeadline - Date.now()),
      waitUntil: "domcontentloaded"
    });
    await page.waitForTimeout(
      Math.max(0, Math.min(CAPTURE_DELAY_MS, captureDeadline - Date.now()))
    );

    const screenshot = await page.screenshot({
      timeout: Math.max(1, captureDeadline - Date.now()),
      type: "png"
    });

    return await storeCapturedImage(Buffer.from(screenshot), target);
  } catch {
    return null;
  } finally {
    await browser.close();
  }
}
