import { beforeEach, describe, expect, it, vi } from "vitest";

const getAppMock = vi.fn();

vi.mock("@/lib/apps/repository", () => ({
  getAppRepository: () => ({
    getApp: getAppMock
  })
}));

import { GET } from "./route";

describe("GET /api/app-thumbnail/[id]/[version]", () => {
  beforeEach(() => {
    getAppMock.mockReset();
  });

  it("streams embedded thumbnails as binary image responses", async () => {
    getAppMock.mockResolvedValue({
      id: "app-1",
      thumbnailUrl: "data:image/png;base64,aGVsbG8="
    });

    const response = await GET(
      new Request("http://localhost/api/app-thumbnail/app-1/1"),
      {
        params: Promise.resolve({ id: "app-1", version: "1" })
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("ETag")).toBe('"app-1-1"');
    expect(Buffer.from(await response.arrayBuffer()).toString("utf8")).toBe(
      "hello"
    );
  });

  it("redirects to non-embedded thumbnail URLs", async () => {
    getAppMock.mockResolvedValue({
      id: "app-2",
      thumbnailUrl: "https://example.com/thumb.png"
    });

    const response = await GET(
      new Request("http://localhost/api/app-thumbnail/app-2/2"),
      {
        params: Promise.resolve({ id: "app-2", version: "2" })
      }
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.com/thumb.png"
    );
  });
});
