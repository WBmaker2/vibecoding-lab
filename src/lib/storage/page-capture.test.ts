import { beforeEach, describe, expect, it, vi } from "vitest";
import { capturePageThumbnail } from "./page-capture";

const mocks = vi.hoisted(() => ({
  fetchSafeHtml: vi.fn(),
  fetchSafeResource: vi.fn(),
  assertSafeRemoteHttpUrl: vi.fn(),
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
  fetchSafeHtml: mocks.fetchSafeHtml,
  fetchSafeResource: mocks.fetchSafeResource
}));

vi.mock("playwright-core", () => ({
  chromium: {
    launch: mocks.launch
  }
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn()
}));

function createRoute(url: string, method = "GET") {
  return {
    abort: vi.fn(),
    continue: vi.fn(),
    fulfill: vi.fn(),
    request: () => ({
      headers: async () => ({
        accept: "*/*",
        "accept-encoding": "gzip",
        cookie: "secret=1"
      }),
      method: () => method,
      url: () => url
    })
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
    mocks.fetchSafeHtml.mockImplementation(async (_input, options) => {
      options.budget.remaining -= 1;
      return {
        finalUrl: "https://public.example/app",
        html: "<html><head></head><body>safe</body></html>"
      };
    });
    mocks.fetchSafeResource.mockImplementation(async (_input, options) => {
      options.budget.remaining -= 1;
      return {
        body: Buffer.from("resource"),
        headers: {
          "content-type": "application/javascript",
          "set-cookie": "secret=1"
        },
        statusCode: 200
      };
    });
  });

  it("rejects the initial URL before launching Chromium", async () => {
    mocks.fetchSafeHtml.mockRejectedValue(new Error("private address"));

    await expect(
      capturePageThumbnail("http://169.254.169.254/latest/meta-data")
    ).resolves.toBeNull();

    expect(mocks.fetchSafeHtml).toHaveBeenCalledWith(
      "http://169.254.169.254/latest/meta-data",
      expect.objectContaining({ deadline: expect.any(Number) })
    );
    expect(mocks.assertSafeRemoteHttpUrl).not.toHaveBeenCalled();
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
    mocks.fetchSafeResource.mockImplementation(async (input: string, options) => {
      if (input.includes("10.0.0.1")) {
        throw new Error("private address");
      }

      options.budget.remaining -= 1;
      return {
        body: Buffer.from("resource"),
        headers: {
          "content-type": "application/javascript",
          "set-cookie": "secret=1"
        },
        statusCode: 200
      };
    });

    await routeHandler(mainRoute);
    await routeHandler(privateRoute);
    await routeHandler(publicRoute);

    expect(mainRoute.fulfill).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining("safe") })
    );
    expect(privateRoute.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(privateRoute.continue).not.toHaveBeenCalled();
    expect(publicRoute.fulfill).toHaveBeenCalledWith(
      expect.objectContaining({
        body: Buffer.from("resource"),
        headers: { "content-type": "application/javascript" },
        status: 200
      })
    );
    expect(publicRoute.abort).not.toHaveBeenCalled();
    expect(publicRoute.continue).not.toHaveBeenCalled();
    expect(mocks.fetchSafeResource).toHaveBeenCalledWith(
      "https://cdn.example/app.js",
      expect.objectContaining({
        maxBytes: 512 * 1024,
        method: "GET"
      })
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

  it("aborts non-HTTP(S) and unsupported-method resources", async () => {
    await capturePageThumbnail("https://public.example/app");

    const routeHandler = mocks.context.route.mock.calls[0]?.[1] as (
      route: ReturnType<typeof createRoute>
    ) => Promise<void>;
    const dataRoute = createRoute("data:text/plain,hello");
    const postRoute = createRoute("https://cdn.example/form", "POST");

    await routeHandler(dataRoute);
    await routeHandler(postRoute);

    expect(dataRoute.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(postRoute.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(mocks.fetchSafeResource).not.toHaveBeenCalledWith(
      "https://cdn.example/form",
      expect.anything()
    );
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
        javaScriptEnabled: false,
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

  it("shares one actual-network budget between document and resources", async () => {
    let documentBudget: unknown;
    let resourceBudget: unknown;
    mocks.fetchSafeHtml.mockImplementation(async (_input, options) => {
      documentBudget = options.budget;
      options.budget.remaining -= 1;
      return {
        finalUrl: "https://public.example/app",
        html: "<html><head></head><body>safe</body></html>"
      };
    });
    mocks.fetchSafeResource.mockImplementation(async (_input, options) => {
      resourceBudget = options.budget;
      options.budget.remaining -= 1;
      return {
        body: Buffer.from("resource"),
        headers: { "content-type": "application/javascript" },
        statusCode: 200
      };
    });

    await capturePageThumbnail("https://public.example/app");
    const routeHandler = mocks.context.route.mock.calls[0]?.[1] as (
      route: ReturnType<typeof createRoute>
    ) => Promise<void>;

    await routeHandler(createRoute("https://cdn.example/app.js"));

    expect(documentBudget).toBe(resourceBudget);
    expect(documentBudget).toEqual({ remaining: 78 });
  });
});
