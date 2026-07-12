import { describe, expect, it } from "vitest";

import { getReusableSnapshotDecision } from "./static-gallery-export-state.mjs";

const baseApps = [
  {
    id: "alpha",
    title: "Alpha",
    summary: "First app",
    url: "https://example.com/alpha",
    githubUrl: "https://github.com/example/alpha",
    tags: ["math", "drawing"],
    thumbnailMode: "upload",
    thumbnailUrl: "data:image/png;base64,ZmFrZQ==",
    subject: "Math",
    grade: "Grade 3",
    memo: "Keep",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z"
  },
  {
    id: "beta",
    title: "Beta",
    summary: "Second app",
    url: "https://example.com/beta",
    githubUrl: null,
    tags: ["science"],
    thumbnailMode: "placeholder",
    thumbnailUrl: null,
    subject: null,
    grade: null,
    memo: null,
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z"
  }
];

const baseSnapshot = {
  assetManifest: [
    {
      path: "/app-thumbnails/alpha.png",
      size: 5,
      sha256: "8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8"
    }
  ],
  version: 1,
  generatedAt: "2026-07-10T00:00:00.000Z",
  appCount: 2,
  apps: [
    { ...baseApps[0], thumbnailUrl: "/app-thumbnails/alpha.png" },
    { ...baseApps[1], thumbnailUrl: null }
  ]
};

function decisionFor({
  sourceApps = baseApps,
  snapshot = baseSnapshot,
  thumbnailFiles = [
    {
      name: "alpha.png",
      type: "file",
      size: 5,
      sha256: "8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8"
    }
  ]
} = {}) {
  return getReusableSnapshotDecision({ sourceApps, snapshot, thumbnailFiles });
}

describe("getReusableSnapshotDecision", () => {
  it("reuses an identical snapshot while ignoring generatedAt", () => {
    const result = decisionFor({
      snapshot: { ...baseSnapshot, generatedAt: "2026-07-11T00:00:00.000Z" }
    });

    expect(result.reusable).toBe(true);
  });

  it.each([
    ["changed metadata", () => ({
      sourceApps: [{ ...baseApps[0], title: "Changed" }, baseApps[1]]
    })],
    ["reordered records", () => ({ sourceApps: [...baseApps].reverse() })],
    ["missing thumbnail", () => ({ thumbnailFiles: [] })],
    ["extra thumbnail", () => ({ thumbnailFiles: ["alpha.png", "orphan.png"] })],
    ["added ID", () => ({
      sourceApps: [...baseApps, { ...baseApps[1], id: "gamma" }]
    })],
    ["deleted ID", () => ({ sourceApps: [baseApps[0]] })]
  ])("does not reuse when %s", (_label, createChanges) => {
    expect(decisionFor(createChanges())).toMatchObject({ reusable: false });
  });

  it.each([
    null,
    "",
    "not-a-date",
    "2026-02-30T00:00:00.000Z",
    "2026-07-10T00:00:00Z",
    "2026-07-10T00:00:00.000+00:00"
  ])(
    "does not reuse a snapshot with malformed generatedAt: %s",
    (generatedAt) => {
      expect(
        decisionFor({ snapshot: { ...baseSnapshot, generatedAt } })
      ).toMatchObject({ reusable: false, reason: "invalid-generated-at" });
    }
  );
});
