import type { AdminAppRecord } from "./types";
import {
  getStaticGallerySyncSummary,
  type StaticGalleryBaseline
} from "./static-gallery-sync-state";

const baseline: StaticGalleryBaseline = {
  assetManifest: [],
  generatedAt: "2026-07-10T00:00:00.000Z",
  appCount: 2,
  updatedAtById: {
    "app-1": "2026-07-09T00:00:00.000Z",
    "app-2": "2026-07-09T01:00:00.000Z"
  }
};

function app(id: string, updatedAt: string): AdminAppRecord {
  return {
    id,
    title: id,
    summary: "summary",
    url: `https://example.com/${id}`,
    tags: ["태그"],
    thumbnailMode: "placeholder",
    thumbnailUrl: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date(updatedAt)
  };
}

describe("getStaticGallerySyncSummary", () => {
  const matchingApps = [
    app("app-1", "2026-07-09T00:00:00.000Z"),
    app("app-2", "2026-07-09T01:00:00.000Z")
  ];

  it("reports no pending changes when DB and snapshot match exactly", () => {
    expect(
      getStaticGallerySyncSummary(
        [
          app("app-1", "2026-07-09T00:00:00.000Z"),
          app("app-2", "2026-07-09T01:00:00.000Z")
        ],
        baseline
      )
    ).toEqual({
      pendingCount: 0,
      dbCount: 2,
      snapshotCount: 2,
      generatedAt: baseline.generatedAt
    });
  });

  it("treats an absent legacy asset manifest as pending", () => {
    const legacyBaseline: StaticGalleryBaseline = {
      generatedAt: baseline.generatedAt,
      appCount: 0,
      updatedAtById: {}
    };

    expect(
      getStaticGallerySyncSummary([], legacyBaseline).pendingCount
    ).toBe(1);
  });

  it.each([null, {}, [{ path: "bad" }]])(
    "treats a malformed asset manifest as pending: %j",
    (assetManifest) => {
      expect(
        getStaticGallerySyncSummary(matchingApps, {
          ...baseline,
          assetManifest: assetManifest as never
        }).pendingCount
      ).toBe(1);
    }
  );

  it("keeps an explicitly present empty manifest valid", () => {
    expect(
      getStaticGallerySyncSummary(matchingApps, {
        ...baseline,
        assetManifest: []
      }).pendingCount
    ).toBe(0);
  });

  it.each([
    "2026-07-10T00:00:00Z",
    "2026-07-10T00:00:00.000+00:00"
  ])("treats parseable noncanonical generatedAt as pending: %s", (generatedAt) => {
    expect(
      getStaticGallerySyncSummary(matchingApps, {
        ...baseline,
        generatedAt
      }).pendingCount
    ).toBe(1);
  });

  it("counts an app added to the DB once", () => {
    expect(
      getStaticGallerySyncSummary(
        [
          app("app-1", "2026-07-09T00:00:00.000Z"),
          app("app-2", "2026-07-09T01:00:00.000Z"),
          app("app-3", "2026-07-09T02:00:00.000Z")
        ],
        baseline
      ).pendingCount
    ).toBe(1);
  });

  it("counts an app deleted from the DB once", () => {
    expect(
      getStaticGallerySyncSummary(
        [app("app-1", "2026-07-09T00:00:00.000Z")],
        baseline
      ).pendingCount
    ).toBe(1);
  });

  it("counts a timestamp change once", () => {
    expect(
      getStaticGallerySyncSummary(
        [
          app("app-1", "2026-07-09T03:00:00.000Z"),
          app("app-2", "2026-07-09T01:00:00.000Z")
        ],
        baseline
      ).pendingCount
    ).toBe(1);
  });

  it("counts the union of multiple added, deleted, and updated IDs once", () => {
    expect(
      getStaticGallerySyncSummary(
        [
          app("app-1", "2026-07-09T03:00:00.000Z"),
          app("app-3", "2026-07-09T02:00:00.000Z")
        ],
        baseline
      ).pendingCount
    ).toBe(3);
  });

  it("treats an invalid snapshot timestamp as pending", () => {
    expect(
      getStaticGallerySyncSummary(
        [
          app("app-1", "2026-07-09T00:00:00.000Z"),
          app("app-2", "2026-07-09T01:00:00.000Z")
        ],
        {
          ...baseline,
          updatedAtById: {
            ...baseline.updatedAtById,
            "app-2": "not-a-date"
          }
        }
      ).pendingCount
    ).toBe(1);
  });

  it.each([
    ["missing required thumbnail", "missing-assets"],
    ["extra thumbnail", "extra-assets"],
    ["changed thumbnail bytes", "changed-assets"]
  ])("treats %s as pending even when timestamps match", (_label, reason) => {
    expect(
      getStaticGallerySyncSummary(
        [
          app("app-1", "2026-07-09T00:00:00.000Z"),
          app("app-2", "2026-07-09T01:00:00.000Z")
        ],
        baseline,
        { valid: false, reason }
      ).pendingCount
    ).toBe(1);
  });
});
