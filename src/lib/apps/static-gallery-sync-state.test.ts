import type { AdminAppRecord } from "./types";
import {
  getStaticGallerySyncSummary,
  type StaticGalleryBaseline
} from "./static-gallery-sync-state";

const baseline: StaticGalleryBaseline = {
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
});
