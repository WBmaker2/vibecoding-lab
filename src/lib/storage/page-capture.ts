import { put } from "@vercel/blob";
import { getThumbnailHostLabel } from "./generated-thumbnail";

const CAPTURE_WIDTH = 1200;
const CAPTURE_HEIGHT = 630;
const CAPTURE_DELAY_MS = 1500;
const CAPTURE_TIMEOUT_MS = 15000;

function getCaptureTarget(sourceUrl: string) {
  try {
    const target = new URL(sourceUrl);

    if (!["http:", "https:"].includes(target.protocol)) {
      return null;
    }

    return target.toString();
  } catch {
    return null;
  }
}

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
  const target = getCaptureTarget(sourceUrl);

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
