import { put } from "@vercel/blob";
import { assertSafeRemoteHttpUrl } from "@/lib/security/remote-url";
import { getThumbnailHostLabel } from "./generated-thumbnail";

const CAPTURE_WIDTH = 1200;
const CAPTURE_HEIGHT = 630;
const CAPTURE_DELAY_MS = 1500;
const CAPTURE_TIMEOUT_MS = 15000;
const MAX_CAPTURE_REQUESTS = 80;

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

export async function capturePageThumbnail(sourceUrl: string) {
  const target = await assertSafeRemoteHttpUrl(sourceUrl)
    .then((url) => url.toString())
    .catch(() => null);

  if (!target) {
    return null;
  }

  const browser = await launchChromium().catch(() => null);

  if (!browser) {
    return null;
  }

  try {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: {
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT
      }
    });
    let requestCount = 0;

    await page.route("**/*", async (route) => {
      if (requestCount >= MAX_CAPTURE_REQUESTS) {
        await route.abort("blockedbyclient");
        return;
      }

      requestCount += 1;

      try {
        await assertSafeRemoteHttpUrl(route.request().url());
        await route.continue();
      } catch {
        await route.abort("blockedbyclient");
      }
    });

    await page.goto(target, {
      timeout: CAPTURE_TIMEOUT_MS,
      waitUntil: "domcontentloaded"
    });
    await page.waitForTimeout(CAPTURE_DELAY_MS);

    const screenshot = await page.screenshot({
      type: "png"
    });

    return await storeCapturedImage(Buffer.from(screenshot), target);
  } catch {
    return null;
  } finally {
    await browser.close();
  }
}
