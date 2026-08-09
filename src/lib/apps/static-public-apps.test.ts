import {
  getStaticGalleryBaseline,
  toStaticPublicAppRecord
} from "./static-public-apps";

describe("static public apps", () => {
  it("preserves a legacy snapshot with no assetManifest key", () => {
    const legacyBaseline = getStaticGalleryBaseline({
      version: 1,
      generatedAt: "2026-07-10T00:00:00.000Z",
      appCount: 0,
      apps: []
    });

    expect(Object.hasOwn(legacyBaseline, "assetManifest")).toBe(false);
    expect(legacyBaseline.assetManifest).toBeUndefined();
  });

  it("reads the optional catalog revision from the snapshot", () => {
    const baseline = getStaticGalleryBaseline({
      version: 1,
      generatedAt: "2026-07-10T00:00:00.000Z",
      catalogRevision: 12,
      appCount: 0,
      apps: []
    });

    expect(baseline.catalogRevision).toBe(12);
  });

  it("converts serialized snapshot apps into public app records", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기", "영어"],
      thumbnailMode: "auto",
      thumbnailUrl: "/app-thumbnails/reading-timer.webp",
      subject: "영어",
      grade: "초등",
      memo: "읽기 루틴 도입용으로 쓰기 좋습니다.",
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.createdAt).toBeInstanceOf(Date);
    expect(record.updatedAt).toBeInstanceOf(Date);
    expect(record.thumbnailUrl).toBe("/app-thumbnails/reading-timer.webp");
    expect(record.tags).toEqual(["읽기", "영어"]);
    expect(record.subjects).toEqual(["영어"]);
    expect(record.gradeBands).toEqual(["all"]);
    expect(record.audience).toBe("student");
  });

  it("drops internal compute thumbnail URLs from the static public payload", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl: "/api/app-thumbnail/reading-timer/1777800000000",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });

  it("drops /api/thumbnail query paths from the static public payload", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl: "/api/thumbnail?app=reading-timer",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });

  it("rejects traversal-like local thumbnail paths", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl: "/app-thumbnails/../api/app-thumbnail/reading-timer",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });

  it("rejects /images/../app-thumbnails path traversal", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl: "/images/../app-thumbnails/readingtimer.png",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });

  it("rejects encoded /images/../app-thumbnails traversal", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl: "/images/%2e%2e/app-thumbnails/readingtimer.png",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });

  it("rejects encoded traversal-like local thumbnail paths", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl: "/app-thumbnails/%2e%2e/api/app-thumbnail/reading-timer",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });

  it("rejects protocol-relative thumbnail URLs", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailUrl: "//evil.example/images/foo.png",
      thumbnailMode: "auto",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });

  it("drops absolute same-origin /api/thumbnail URLs", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl: "https://www.vivehong.shop/api/thumbnail?host=x",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });

  it("drops absolute same-origin /api/app-thumbnail URLs", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl: "https://www.vivehong.shop/api/app-thumbnail/foo/1",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });

  it("rejects absolute URLs with encoded dot traversal", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl:
        "https://www.vivehong.shop/images/%2e%2e/api/thumbnail?host=x",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });
});
