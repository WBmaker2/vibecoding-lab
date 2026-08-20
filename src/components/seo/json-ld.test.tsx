import { render } from "@testing-library/react";
import { JsonLd, serializeJsonLd } from "./json-ld";

describe("JsonLd", () => {
  it("escapes opening angle brackets before rendering JSON", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });

    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003c/script>");
  });

  it("renders an application/ld+json script", () => {
    const { container } = render(<JsonLd data={{ "@type": "CollectionPage" }} />);

    expect(container.querySelector('script[type="application/ld+json"]')).toHaveTextContent(
      '"@type":"CollectionPage"'
    );
  });
});
