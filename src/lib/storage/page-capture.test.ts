import { beforeEach, describe, expect, it, vi } from "vitest";
import { capturePageThumbnail } from "./page-capture";

const mocks = vi.hoisted(() => ({
  assertSafeRemoteHttpUrl: vi.fn(),
  browser: {
    close: vi.fn(),
    newPage: vi.fn()
  },
  launch: vi.fn(),
  page: {
    goto: vi.fn(),
    route: vi.fn(),
    screenshot: vi.fn(),
    waitForTimeout: vi.fn()
  }
}));

vi.mock("@/lib/security/remote-url", () => ({
  assertSafeRemoteHttpUrl: mocks.assertSafeRemoteHttpUrl
}));

vi.mock("playwright-core", () => ({
  chromium: {
    launch: mocks.launch
  }
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn()
}));

function createRoute(url: string) {
  return {
    abort: vi.fn(),
    continue: vi.fn(),
    request: () => ({ url: () => url })
  };
}

describe("capturePageThumbnail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
    mocks.assertSafeRemoteHttpUrl.mockImplementation(async (input: string) =>
      new URL(input)
    );
    mocks.browser.newPage.mockResolvedValue(mocks.page);
    mocks.launch.mockResolvedValue(mocks.browser);
    mocks.page.screenshot.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  it("rejects the initial URL before launching Chromium", async () => {
    mocks.assertSafeRemoteHttpUrl.mockRejectedValue(
      new Error("private address")
    );

    await expect(
      capturePageThumbnail("http://169.254.169.254/latest/meta-data")
    ).resolves.toBeNull();

    expect(mocks.assertSafeRemoteHttpUrl).toHaveBeenCalledWith(
      "http://169.254.169.254/latest/meta-data"
    );
    expect(mocks.launch).not.toHaveBeenCalled();
  });

  it("validates every subresource and aborts private requests", async () => {
    await capturePageThumbnail("https://public.example/app");

    const routeHandler = mocks.page.route.mock.calls[0]?.[1] as (
      route: ReturnType<typeof createRoute>
    ) => Promise<void>;
    const privateRoute = createRoute("http://10.0.0.1/private");
    const publicRoute = createRoute("https://cdn.example/app.js");

    mocks.assertSafeRemoteHttpUrl.mockImplementation(
      async (input: string) => {
        const url = new URL(input);

        if (url.hostname === "10.0.0.1") {
          throw new Error("private address");
        }

        return url;
      }
    );

    await routeHandler(privateRoute);
    await routeHandler(publicRoute);

    expect(privateRoute.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(privateRoute.continue).not.toHaveBeenCalled();
    expect(publicRoute.continue).toHaveBeenCalledTimes(1);
    expect(mocks.assertSafeRemoteHttpUrl).toHaveBeenCalledWith(
      "http://10.0.0.1/private"
    );
    expect(mocks.assertSafeRemoteHttpUrl).toHaveBeenCalledWith(
      "https://cdn.example/app.js"
    );
  });

  it("aborts requests after the eighty-request capture budget", async () => {
    await capturePageThumbnail("https://public.example/app");

    const routeHandler = mocks.page.route.mock.calls[0]?.[1] as (
      route: ReturnType<typeof createRoute>
    ) => Promise<void>;

    for (let index = 0; index < 80; index += 1) {
      await routeHandler(createRoute(`https://cdn.example/${index}.js`));
    }

    const overflowRoute = createRoute("https://cdn.example/overflow.js");
    await routeHandler(overflowRoute);

    expect(overflowRoute.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(overflowRoute.continue).not.toHaveBeenCalled();
  });

  it("always closes Chromium when capture fails", async () => {
    mocks.page.goto.mockRejectedValue(new Error("navigation failed"));

    await expect(
      capturePageThumbnail("https://public.example/app")
    ).resolves.toBeNull();

    expect(mocks.browser.close).toHaveBeenCalledTimes(1);
  });
});
