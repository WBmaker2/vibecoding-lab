import { beforeEach, describe, expect, it, vi } from "vitest";
import { capturePageThumbnail } from "./page-capture";

const mocks = vi.hoisted(() => ({
  assertSafeRemoteHttpUrl: vi.fn(),
  fetchSafeHtml: vi.fn(),
  browser: {
    close: vi.fn(),
    newContext: vi.fn(),
    newPage: vi.fn()
  },
  launch: vi.fn(),
  page: {
    goto: vi.fn(),
    route: vi.fn(),
    screenshot: vi.fn(),
    waitForTimeout: vi.fn()
  },
  context: {
    newPage: vi.fn(),
    route: vi.fn()
  }
}));

vi.mock("@/lib/security/remote-url", () => ({
  assertSafeRemoteHttpUrl: mocks.assertSafeRemoteHttpUrl,
  fetchSafeHtml: mocks.fetchSafeHtml
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
    fulfill: vi.fn(),
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
    mocks.browser.newContext.mockResolvedValue(mocks.context);
    mocks.context.newPage.mockResolvedValue(mocks.page);
    mocks.launch.mockResolvedValue(mocks.browser);
    mocks.page.screenshot.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.fetchSafeHtml.mockResolvedValue({
      finalUrl: "https://public.example/app",
      html: "<html><head></head><body>safe</body></html>"
    });
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

    const routeHandler = mocks.context.route.mock.calls[0]?.[1] as (
      route: ReturnType<typeof createRoute>
    ) => Promise<void>;
    const privateRoute = createRoute("http://10.0.0.1/private");
    const publicRoute = createRoute("https://cdn.example/app.js");
    const mainRoute = createRoute("https://public.example/app");

    mocks.assertSafeRemoteHttpUrl.mockImplementation(
      async (input: string) => {
        const url = new URL(input);

        if (url.hostname === "10.0.0.1") {
          throw new Error("private address");
        }

        return url;
      }
    );

    await routeHandler(mainRoute);
    await routeHandler(privateRoute);
    await routeHandler(publicRoute);

    expect(mainRoute.fulfill).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining("safe") })
    );
    expect(privateRoute.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(privateRoute.continue).not.toHaveBeenCalled();
    expect(publicRoute.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(publicRoute.continue).not.toHaveBeenCalled();
    expect(mocks.assertSafeRemoteHttpUrl).toHaveBeenCalledWith(
      "http://10.0.0.1/private"
    );
    expect(mocks.assertSafeRemoteHttpUrl).toHaveBeenCalledWith(
      "https://cdn.example/app.js"
    );
  });

  it("aborts requests after the eighty-request capture budget", async () => {
    await capturePageThumbnail("https://public.example/app");

    const routeHandler = mocks.context.route.mock.calls[0]?.[1] as (
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

  it("blocks service workers and routes at context level before navigation", async () => {
    await capturePageThumbnail("https://public.example/app");

    expect(mocks.browser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceWorkers: "block"
      })
    );
    expect(mocks.context.route).toHaveBeenCalledWith(
      "**/*",
      expect.any(Function)
    );
    expect(mocks.context.route.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.page.goto.mock.invocationCallOrder[0]
    );
    expect(mocks.fetchSafeHtml).toHaveBeenCalledWith(
      "https://public.example/app",
      expect.any(Object)
    );
  });
});
