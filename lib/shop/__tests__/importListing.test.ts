import { describe, expect, it } from "vitest";

import {
  challengeIn,
  htmlToText,
  parseListing,
  parseShopifyProduct,
  shopifyProductJsonUrl,
  slugify,
  toCents,
  uniqueSlug,
} from "../importListing";

const BASE = "https://distributor.example/products/brass-censer";

function page(body: string): string {
  return `<!doctype html><html><head><title>Fallback title</title>${body}</head><body><h1>Brass censer</h1></body></html>`;
}

describe("toCents", () => {
  it("reads the shapes a price tag comes in", () => {
    expect(toCents("$24.99")).toBe(2499);
    expect(toCents("24.99 USD")).toBe(2499);
    expect(toCents("1,299.00")).toBe(129_900);
    expect(toCents(24.99)).toBe(2499);
    expect(toCents("9")).toBe(900);
  });

  it("treats a trailing comma pair as a decimal point, not a thousands mark", () => {
    // The 100x bug: "24,99" is twenty four euro ninety nine, not 2499 euro.
    expect(toCents("24,99")).toBe(2499);
    expect(toCents("1.299,50")).toBe(129_950);
  });

  it("gives up rather than guessing", () => {
    expect(toCents("Call for pricing")).toBeNull();
    expect(toCents(null)).toBeNull();
    expect(toCents(undefined)).toBeNull();
  });
});

describe("slugs", () => {
  it("makes a slug the product schema accepts", () => {
    expect(slugify("Brass Censer, Byzantine (Large)")).toBe("brass-censer-byzantine-large");
    expect(slugify("Ikonę św. Mikołaja")).toBe("ikone-sw-mikolaja");
    expect(slugify("!!!")).toBe("listing");
  });

  it("does not collide with a listing that already exists", () => {
    expect(uniqueSlug("brass-censer", [])).toBe("brass-censer");
    expect(uniqueSlug("brass-censer", ["brass-censer"])).toBe("brass-censer-2");
    expect(uniqueSlug("brass-censer", ["brass-censer", "brass-censer-2"])).toBe("brass-censer-3");
  });
});

describe("htmlToText", () => {
  it("keeps the shape of a description and drops the markup", () => {
    const out = htmlToText("<p>Hand cast brass.</p><ul><li>4 inch</li><li>Chain included</li></ul>");
    expect(out).toBe("Hand cast brass.\n\n- 4 inch\n- Chain included");
  });

  it("decodes entities, and an em dash comes back as a comma", () => {
    expect(htmlToText("Blessed &amp; sealed &mdash; ready to ship")).toBe(
      "Blessed & sealed , ready to ship",
    );
  });
});

describe("parseListing, JSON-LD", () => {
  const html = page(`
    <script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[
      {"@type":"BreadcrumbList","itemListElement":[]},
      {"@type":"Product","name":"Brass Censer","sku":"BC-4421","material":"Brass",
       "brand":{"@type":"Brand","name":"Athos Works"},
       "description":"<p>Hand cast brass censer.</p>",
       "image":["/img/censer-1.jpg","https://cdn.example/censer-2.jpg"],
       "offers":{"@type":"Offer","price":"32.50","priceCurrency":"USD",
                 "availability":"https://schema.org/InStock"}}
    ]}
    </script>`);

  it("reads the listing out of the graph", () => {
    const got = parseListing(html, BASE);
    expect(got.source).toBe("json-ld");
    expect(got.title).toBe("Brass Censer");
    expect(got.priceCents).toBe(3250);
    expect(got.currency).toBe("USD");
    expect(got.sku).toBe("BC-4421");
    expect(got.brand).toBe("Athos Works");
    expect(got.material).toBe("Brass");
    expect(got.availability).toBe("In stock");
    expect(got.description).toBe("Hand cast brass censer.");
    expect(got.warnings).toEqual([]);
  });

  it("makes relative images absolute against the page they came from", () => {
    expect(parseListing(html, BASE).images).toEqual([
      "https://distributor.example/img/censer-1.jpg",
      "https://cdn.example/censer-2.jpg",
    ]);
  });
});

describe("parseListing, meta only", () => {
  const html = page(`
    <meta property="og:title" content="Olive Wood Cross" />
    <meta property="og:description" content="Carved in Bethlehem." />
    <meta property="og:image" content="https://cdn.example/cross.jpg" />
    <meta property="og:image" content="https://cdn.example/cross.jpg" />
    <meta property="product:price:amount" content="18.00" />
    <meta property="product:price:currency" content="USD" />
    <link rel="canonical" href="https://distributor.example/p/olive-cross" />`);

  it("falls back to OpenGraph when there is no JSON-LD", () => {
    const got = parseListing(html, BASE);
    expect(got.source).toBe("meta");
    expect(got.title).toBe("Olive Wood Cross");
    expect(got.description).toBe("Carved in Bethlehem.");
    expect(got.priceCents).toBe(1800);
    expect(got.canonicalUrl).toBe("https://distributor.example/p/olive-cross");
  });

  it("does not list the same picture twice", () => {
    expect(parseListing(html, BASE).images).toEqual(["https://cdn.example/cross.jpg"]);
  });
});

describe("parseListing, nothing useful", () => {
  it("says what is missing instead of inventing it", () => {
    const got = parseListing("<html><body><p>Coming soon</p></body></html>", BASE);
    expect(got.priceCents).toBeNull();
    expect(got.images).toEqual([]);
    expect(got.warnings.join(" ")).toMatch(/price/i);
    expect(got.warnings.join(" ")).toMatch(/pictures/i);
  });

  it("reports an empty page rather than throwing", () => {
    expect(parseListing("", BASE).warnings[0]).toMatch(/empty/i);
  });
});

describe("Shopify", () => {
  it("spots a product link that has a JSON twin", () => {
    expect(shopifyProductJsonUrl(BASE)).toBe(
      "https://distributor.example/products/brass-censer.json",
    );
    expect(shopifyProductJsonUrl("https://distributor.example/collections/all")).toBeNull();
  });

  it("takes price and SKU off the first variant and says there are more", () => {
    const got = parseShopifyProduct(
      {
        product: {
          title: "Censer, three bell",
          vendor: "Athos Works",
          body_html: "<p>Brass, with bells.</p>",
          images: [{ src: "https://cdn.example/a.jpg" }, { src: "https://cdn.example/b.jpg" }],
          variants: [
            { title: "Small", price: "45.00", sku: "C-S", available: true },
            { title: "Large", price: "62.00", sku: "C-L", available: false },
          ],
        },
      },
      BASE,
    );
    expect(got?.source).toBe("shopify");
    expect(got?.priceCents).toBe(4500);
    expect(got?.sku).toBe("C-S");
    expect(got?.brand).toBe("Athos Works");
    expect(got?.availability).toBe("In stock");
    expect(got?.images).toHaveLength(2);
    expect(got?.warnings[0]).toMatch(/2 variants/);
  });

  it("returns null for JSON that is not a product", () => {
    expect(parseShopifyProduct({ errors: "Not Found" }, BASE)).toBeNull();
  });
});

describe("challengeIn", () => {
  it("names what is in the way", () => {
    expect(challengeIn('<div class="g-recaptcha"></div>')).toBe("reCAPTCHA");
    expect(challengeIn("<title>Just a moment...</title>")).toBe("Cloudflare check");
    expect(challengeIn("<p>Please verify you are human</p>")).toBe("a bot check");
    expect(challengeIn("<html>short</html>", 403)).toBe("an HTTP 403 block");
  });

  it("leaves a normal product page alone", () => {
    expect(challengeIn(page('<meta property="og:title" content="Censer" />'))).toBeNull();
  });
});

describe("parseListing, a plain cart with no structured data", () => {
  // The shape of a small distributor's page: a heading, a price in a tag that
  // says price, a gallery, and a stock line. No JSON-LD, no OpenGraph.
  const html = `<!doctype html><html><head><title>Censer | Supply Co</title></head><body>
    <img src="/static/logo.png" class="site-logo" alt="Supply Co" width="120" height="40" />
    <h1>Hanging Vigil Lamp</h1>
    <div id="product_gallery"><img src="../media/lamp-main.jpg" alt="Hanging Vigil Lamp" width="600" height="600" /></div>
    <p class="price_color">£51.77</p>
    <p class="instock availability">In stock (22 available)</p>
    <div id="description"><p>Brass lamp with a red glass.</p></div>
    <img src="/static/icons/cart-icon.png" width="24" height="24" alt="cart" />
  </body></html>`;

  it("finds the price in the tag that says price", () => {
    const got = parseListing(html, "https://supply.example/catalogue/lamp/index.html");
    expect(got.priceCents).toBe(5177);
    expect(got.currency).toBe("GBP");
  });

  it("takes the gallery picture and leaves the logo and the cart icon", () => {
    const got = parseListing(html, "https://supply.example/catalogue/lamp/index.html");
    // "../media/..." from /catalogue/lamp/ is /catalogue/media/..., which is
    // the browser's answer too.
    expect(got.images).toEqual(["https://supply.example/catalogue/media/lamp-main.jpg"]);
  });

  it("reads the stock line and the heading", () => {
    const got = parseListing(html, "https://supply.example/catalogue/lamp/index.html");
    expect(got.availability).toBe("In stock");
    expect(got.title).toBe("Hanging Vigil Lamp");
    expect(got.source).toBe("html");
  });
});
