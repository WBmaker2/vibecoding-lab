import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertSafeRemoteHttpUrl,
  fetchSafeHtml,
  isPublicIpAddress
} from "./remote-url";

const publicLookup = async () => [
  { address: "93.184.216.34", family: 4 as const }
];

const privateLookup = async (hostname: string) => [
  {
    address: hostname === "private.example" ? "10.0.0.1" : "93.184.216.34",
    family: 4 as const
  }
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
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
    "192.0.2.1",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:10.0.0.1"
  ])("rejects non-public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it("accepts a public IPv4 address", () => {
    expect(isPublicIpAddress("93.184.216.34")).toBe(true);
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
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://example.com/next#section" }
        })
      )
      .mockResolvedValueOnce(
        new Response("<html>ok</html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" }
        })
      );

    const result = await fetchSafeHtml("https://example.com/start", {
      lookup: publicLookup
    });

    expect(result).toEqual({
      html: "<html>ok</html>",
      finalUrl: "https://example.com/next"
    });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      redirect: "manual"
    });
  });

  it("rejects a redirect to a private address", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://private.example/metadata" }
      })
    );

    await expect(
      fetchSafeHtml("https://example.com/start", {
        lookup: privateLookup
      })
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects non-HTML content", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response("image", {
        status: 200,
        headers: { "content-type": "image/png" }
      })
    );

    await expect(
      fetchSafeHtml("https://example.com/image.png", {
        lookup: publicLookup
      })
    ).rejects.toThrow(/HTML/);
  });

  it("aborts when the timeout expires", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted", "AbortError"));
          });
        })
    );

    await expect(
      fetchSafeHtml("https://example.com/slow", {
        lookup: publicLookup,
        timeoutMs: 5
      })
    ).rejects.toThrow();
  });

  it("cancels the response reader when the byte limit is exceeded", async () => {
    const fetchMock = vi.mocked(fetch);
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(6));
      },
      cancel() {
        cancelled = true;
      }
    });
    fetchMock.mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { "content-type": "text/html" }
      })
    );

    await expect(
      fetchSafeHtml("https://example.com/large", {
        lookup: publicLookup,
        maxBytes: 5
      })
    ).rejects.toThrow(/size limit/i);
    expect(cancelled).toBe(true);
  });
});
