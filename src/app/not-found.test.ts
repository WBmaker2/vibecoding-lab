import { describe, expect, it } from "vitest";
import { metadata } from "./not-found";

describe("not-found metadata", () => {
  it("keeps missing pages out of indexes and without a canonical URL", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.alternates).toEqual({ canonical: null });
  });
});
