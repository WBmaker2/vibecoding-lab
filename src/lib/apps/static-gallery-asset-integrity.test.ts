import { describe, expect, it } from "vitest";
import { compareStaticGalleryAssetManifest } from "./static-gallery-asset-integrity";

const alpha = {
  path: "/app-thumbnails/alpha.png",
  size: 5,
  sha256: "8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8"
};

describe("static gallery asset integrity", () => {
  it("accepts the same manifest regardless of entry order", () => {
    expect(
      compareStaticGalleryAssetManifest(
        [alpha, { ...alpha, path: "/app-thumbnails/beta.png" }],
        [{ ...alpha, path: "/app-thumbnails/beta.png" }, alpha]
      )
    ).toEqual({ valid: true, reason: "assets-match" });
  });

  it.each([
    ["missing-assets", []],
    [
      "extra-assets",
      [alpha, { ...alpha, path: "/app-thumbnails/beta.png" }]
    ],
    ["changed-assets", [{ ...alpha, size: 6 }]]
  ])("marks %s as pending", (reason, actual) => {
    expect(compareStaticGalleryAssetManifest([alpha], actual)).toEqual({
      valid: false,
      reason
    });
  });
});
