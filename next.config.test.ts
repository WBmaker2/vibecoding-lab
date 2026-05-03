import nextConfig from "./next.config";

describe("next image config", () => {
  it("allows internal app-thumbnail routes to be optimized", () => {
    expect(nextConfig.images?.localPatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pathname: "/api/app-thumbnail/**"
        })
      ])
    );
  });
});
