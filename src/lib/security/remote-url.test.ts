import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertSafeRemoteHttpUrl,
  fetchSafeHtml,
  fetchSafeResource,
  isPublicIpAddress
} from "./remote-url";

const transportMocks = vi.hoisted(() => ({
  httpRequest: vi.fn(),
  httpsRequest: vi.fn()
}));

vi.mock("node:http", () => ({
  default: { request: transportMocks.httpRequest },
  request: transportMocks.httpRequest
}));

vi.mock("node:https", () => ({
  default: { request: transportMocks.httpsRequest },
  request: transportMocks.httpsRequest
}));

const publicLookup = async () => [
  { address: "93.184.216.34", family: 4 as const }
];

const privateLookup = async (hostname: string) => [
  {
    address: hostname === "private.example" ? "10.0.0.1" : "93.184.216.34",
    family: 4 as const
  }
];

function mockTransportResponse({
  body = "",
  delayMs = 0,
  headers = {},
  statusCode = 200
}: {
  body?: string;
  delayMs?: number;
  headers?: Record<string, string>;
  statusCode?: number;
}) {
  transportMocks.httpsRequest.mockImplementationOnce(
    (
      _options: object,
      callback: (response: EventEmitter) => void
    ) => {
      const request = new EventEmitter() as EventEmitter & {
        destroy: () => void;
        end: () => void;
        setTimeout: (timeout: number, callback: () => void) => void;
      };
      const response = new EventEmitter() as EventEmitter & {
        destroy: () => void;
        headers: Record<string, string>;
        statusCode: number;
      };

      response.headers = headers;
      response.statusCode = statusCode;
      response.destroy = () => undefined;
      request.destroy = () => undefined;
      request.setTimeout = (timeout, callback) => {
        if (delayMs > 0) {
          setTimeout(callback, timeout);
        }
      };
      request.end = () => {
        const emitResponse = () => {
          callback(response);
          response.emit("data", Buffer.from(body));
          response.emit("end");
        };

        if (delayMs > 0) {
          setTimeout(emitResponse, delayMs);
        } else {
          queueMicrotask(emitResponse);
        }
      };

      return request;
    }
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  transportMocks.httpRequest.mockReset();
  transportMocks.httpsRequest.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isPublicIpAddress", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "100.64.0.1",
    "169.254.169.254",
    "192.0.0.1",
    "192.0.2.1",
    "192.31.196.1",
    "192.52.193.1",
    "192.88.99.1",
    "192.175.48.1",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:10.0.0.1",
    "2001:2::1",
    "2001:10::1",
    "2001:20::1",
    "2001:db8::1",
    "2001:0000::1",
    "2002:c000:0204::1",
    "3fff::1",
    "64:ff9b::192.0.2.1"
  ])("rejects non-public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it("accepts a public IPv4 address", () => {
    expect(isPublicIpAddress("93.184.216.34")).toBe(true);
    expect(isPublicIpAddress("8.8.8.8")).toBe(true);
  });

  it("accepts a globally routable IPv6 address", () => {
    expect(isPublicIpAddress("2001:4860:4860::8888")).toBe(true);
  });
});

describe("assertSafeRemoteHttpUrl", () => {
  it.each([
    "http://localhost",
    "http://user:password@example.com/image.png",
    "http://127.0.0.1/image.png",
    "http://10.0.0.1/image.png",
    "http://100.64.0.1/image.png",
    "http://169.254.169.254/latest/meta-data",
    "http://192.0.2.1/image.png",
    "http://224.0.0.1/image.png",
    "http://[::1]/image.png",
    "http://[fc00::1]/image.png",
    "http://[fe80::1]/image.png",
    "http://[::ffff:10.0.0.1]/image.png"
  ])("rejects unsafe URL %s", async (input) => {
    await expect(
      assertSafeRemoteHttpUrl(input, {
        lookup: async () => [{ address: "93.184.216.34", family: 4 }]
      })
    ).rejects.toThrow();
  });

  it("accepts a hostname when every DNS answer is public", async () => {
    const result = await assertSafeRemoteHttpUrl(
      "https://example.com/image.png#fragment",
      {
        lookup: async () => [{ address: "93.184.216.34", family: 4 }]
      }
    );

    expect(result.toString()).toBe("https://example.com/image.png");
  });

  it("rejects a hostname when any DNS answer is private", async () => {
    await expect(
      assertSafeRemoteHttpUrl("https://mixed.example/image.png", {
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "10.0.0.1", family: 4 }
        ]
      })
    ).rejects.toThrow();
  });
});

describe("fetchSafeHtml", () => {
  it("validates redirects and returns the fragment-free final URL", async () => {
    mockTransportResponse({
      statusCode: 302,
      headers: { location: "https://example.com/next#section" }
    });
    mockTransportResponse({
      body: "<html>ok</html>",
      headers: { "content-type": "text/html; charset=utf-8" }
    });

    const result = await fetchSafeHtml("https://example.com/start", {
      lookup: publicLookup
    });

    expect(result).toEqual({
      html: "<html>ok</html>",
      finalUrl: "https://example.com/next"
    });
    expect(transportMocks.httpsRequest.mock.calls[0]?.[0]).toMatchObject({
      hostname: "example.com",
      lookup: expect.any(Function)
    });
  });

  it("rejects a redirect to a private address", async () => {
    mockTransportResponse({
      statusCode: 302,
      headers: { location: "https://private.example/metadata" }
    });

    await expect(
      fetchSafeHtml("https://example.com/start", {
        lookup: privateLookup
      })
    ).rejects.toThrow();
    expect(transportMocks.httpsRequest).toHaveBeenCalledTimes(1);
  });

  it("rejects non-HTML content", async () => {
    mockTransportResponse({
      body: "image",
      headers: { "content-type": "image/png" }
    });

    await expect(
      fetchSafeHtml("https://example.com/image.png", {
        lookup: publicLookup
      })
    ).rejects.toThrow(/HTML/);
  });

  it("requires an exact HTML media type before parameters", async () => {
    mockTransportResponse({
      body: "<html>spoofed</html>",
      headers: { "content-type": "text/html-malicious; charset=utf-8" }
    });

    await expect(
      fetchSafeHtml("https://example.com/spoofed", {
        lookup: publicLookup
      })
    ).rejects.toThrow(/HTML/);
  });

  it("aborts when the timeout expires", async () => {
    transportMocks.httpsRequest.mockImplementationOnce(() => {
      const request = new EventEmitter() as EventEmitter & {
        destroy: () => void;
        end: () => void;
        setTimeout: (timeout: number, callback: () => void) => void;
      };
      request.destroy = () => undefined;
      request.end = () => undefined;
      request.setTimeout = (timeout, callback) => {
        setTimeout(callback, timeout);
      };
      return request;
    });

    await expect(
      fetchSafeHtml("https://example.com/slow", {
        lookup: publicLookup,
        timeoutMs: 5
      })
    ).rejects.toThrow();
  });

  it("includes DNS lookup in the single timeout deadline", async () => {
    const pendingLookup = async () =>
      new Promise<{ address: string; family: 4 }[]>(() => undefined);
    const result = await Promise.race([
      fetchSafeHtml("https://example.com/slow-dns", {
        lookup: pendingLookup,
        timeoutMs: 5
      }).then(
        () => "resolved",
        () => "rejected"
      ),
      new Promise((resolve) => setTimeout(() => resolve("deadline"), 100))
    ]);

    expect(result).toBe("rejected");
  });

  it("does not reset the deadline across redirects", async () => {
    mockTransportResponse({
      delayMs: 1,
      headers: { location: "https://example.com/next" },
      statusCode: 302
    });
    mockTransportResponse({
      body: "<html>late</html>",
      delayMs: 80,
      headers: { "content-type": "text/html" }
    });

    await expect(
      fetchSafeHtml("https://example.com/start", {
        lookup: publicLookup,
        timeoutMs: 30
      })
    ).rejects.toThrow(/timed out/i);
    expect(transportMocks.httpsRequest).toHaveBeenCalledTimes(2);
  });

  it("spends one shared budget unit on every redirect hop", async () => {
    mockTransportResponse({
      headers: { location: "https://example.com/next" },
      statusCode: 302
    });
    mockTransportResponse({
      body: "<html>ok</html>",
      headers: { "content-type": "text/html" }
    });
    const budget = { remaining: 2 };

    await expect(
      fetchSafeHtml("https://example.com/start", {
        budget,
        lookup: publicLookup
      })
    ).resolves.toEqual({
      finalUrl: "https://example.com/next",
      html: "<html>ok</html>"
    });
    expect(transportMocks.httpsRequest).toHaveBeenCalledTimes(2);
    expect(budget.remaining).toBe(0);
  });

  it("fails closed before transport when the shared budget is exhausted", async () => {
    mockTransportResponse({
      headers: { location: "https://example.com/next" },
      statusCode: 302
    });
    const budget = { remaining: 1 };

    await expect(
      fetchSafeHtml("https://example.com/start", {
        budget,
        lookup: publicLookup
      })
    ).rejects.toThrow(/budget/i);
    expect(transportMocks.httpsRequest).toHaveBeenCalledTimes(1);
    expect(budget.remaining).toBe(0);
  });

  it("cancels the response reader when the byte limit is exceeded", async () => {
    mockTransportResponse({
      body: "123456",
      headers: { "content-type": "text/html" }
    });

    await expect(
      fetchSafeHtml("https://example.com/large", {
        lookup: publicLookup,
        maxBytes: 5
      })
    ).rejects.toThrow(/size limit/i);
  });

  it("pins the validated address in the actual HTTPS request lookup", async () => {
    const requestOptions: {
      lookup?: (
        hostname: string,
        options: { all?: boolean },
        callback: (
          error: Error | null,
          address: string | { address: string; family: number }[],
          family?: number
        ) => void
      ) => void;
    } = {};
    transportMocks.httpsRequest.mockImplementationOnce(
      (
        options: typeof requestOptions,
        callback: (response: EventEmitter) => void
      ) => {
        Object.assign(requestOptions, options);
        const request = new EventEmitter() as EventEmitter & {
          end: () => void;
          setTimeout: (timeout: number) => void;
        };
        const response = new EventEmitter() as EventEmitter & {
          headers: Record<string, string>;
          statusCode: number;
        };

        response.headers = { "content-type": "text/html" };
        response.statusCode = 200;
        request.end = () => {
          queueMicrotask(() => {
            callback(response);
            response.emit("data", Buffer.from("<html>pinned</html>"));
            response.emit("end");
          });
        };
        request.setTimeout = () => undefined;
        return request;
      }
    );

    const result = await fetchSafeHtml("https://example.com/pinned", {
      lookup: publicLookup
    });

    expect(result.html).toBe("<html>pinned</html>");
    expect(requestOptions.lookup).toEqual(expect.any(Function));

    const address = await new Promise<{ address: string; family: number }>(
      (resolve, reject) => {
        requestOptions.lookup?.("example.com", {}, (error, value, family) => {
          if (error) {
            reject(error);
            return;
          }

          resolve({ address: value, family });
        });
      }
    );

    expect(address).toEqual({ address: "93.184.216.34", family: 4 });

    const addresses = await new Promise<{ address: string; family: number }[]>(
      (resolve, reject) => {
        requestOptions.lookup?.("example.com", { all: true }, (error, value) => {
          if (error || !Array.isArray(value)) {
            reject(error ?? new Error("Expected all lookup results."));
            return;
          }

          resolve(value);
        });
      }
    );

    expect(addresses).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });

  it("fetches a bounded resource through the pinned transport", async () => {
    mockTransportResponse({
      body: "image-bytes",
      headers: {
        "content-type": "image/png",
        "x-internal": "must-not-be-forwarded"
      }
    });

    const result = await fetchSafeResource("https://example.com/icon.png", {
      lookup: publicLookup,
      maxBytes: 128,
      method: "GET"
    });

    expect(result.body.toString()).toBe("image-bytes");
    expect(result.headers["content-type"]).toBe("image/png");
    expect(transportMocks.httpsRequest.mock.calls[0]?.[0]).toMatchObject({
      method: "GET",
      headers: expect.objectContaining({ "accept-encoding": "identity" }),
      lookup: expect.any(Function)
    });
  });
});
