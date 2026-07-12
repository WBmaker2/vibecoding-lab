import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES } from "../../src/lib/security/image-policy.mjs";

async function loadPreparation() {
  const preparation = await import(
    "./apps-import-backup-preparation.mjs"
  ).catch(() => null);

  expect(preparation?.prepareBackupApps).toBeTypeOf("function");
  return preparation.prepareBackupApps;
}

describe("backup import preparation", () => {
  it("replaces a spoofed data image before database insertion", async () => {
    const prepareBackupApps = await loadPreparation();
    const [prepared] = prepareBackupApps({
      apps: [
        {
          id: "app-1",
          thumbnailMode: "upload",
          thumbnailUrl: `data:image/png;base64,${Buffer.from(
            "not a png"
          ).toString("base64")}`
        }
      ]
    });

    expect(prepared).toMatchObject({
      id: "app-1",
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });

  it("preserves a valid supported data image", async () => {
    const prepareBackupApps = await loadPreparation();
    const validPng = `data:image/png;base64,${Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    ]).toString("base64")}`;
    const [prepared] = prepareBackupApps({
      apps: [
        { id: "app-1", thumbnailMode: "upload", thumbnailUrl: validPng }
      ]
    });

    expect(prepared).toMatchObject({
      thumbnailMode: "upload",
      thumbnailUrl: validPng
    });
  });

  it.each([
    ["SVG", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
    ["malformed", "data:image/png;base64,%%%"],
    [
      "oversized",
      `data:image/png;base64,${Buffer.alloc(MAX_IMAGE_BYTES + 1).toString(
        "base64"
      )}`
    ]
  ])("replaces an invalid %s data image", async (_label, thumbnailUrl) => {
    const prepareBackupApps = await loadPreparation();
    const [prepared] = prepareBackupApps({
      apps: [{ id: "app-1", thumbnailMode: "upload", thumbnailUrl }]
    });

    expect(prepared).toMatchObject({
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });
});
