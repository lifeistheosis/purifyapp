import { describe, expect, it } from "vitest";

import {
  hasSupplierImage,
  isSupplierImageUrl,
  primaryMediaUrl,
} from "../imageRights";

// The storefront (lib/shop/catalog) HIDES gated listings and the admin
// panel FLAGS them with this same predicate; these tests pin the behavior
// both sides rely on.

const own = (over: Partial<Media> = {}): Media => ({
  media_url: "https://media.purifyapp.net/products/own-photo.jpg",
  sort_order: 0,
  is_primary: false,
  ...over,
});

type Media = {
  media_url: string;
  sort_order?: number | null;
  is_primary?: boolean | null;
};

describe("primaryMediaUrl", () => {
  it("returns null with no media", () => {
    expect(primaryMediaUrl([])).toBeNull();
  });

  it("prefers is_primary over sort_order", () => {
    const rows = [
      own({ media_url: "https://a.example/1.jpg", sort_order: 0 }),
      own({ media_url: "https://a.example/2.jpg", sort_order: 5, is_primary: true }),
    ];
    expect(primaryMediaUrl(rows)).toBe("https://a.example/2.jpg");
  });

  it("falls back to sort_order and does not mutate the input", () => {
    const rows = [
      own({ media_url: "https://a.example/late.jpg", sort_order: 2 }),
      own({ media_url: "https://a.example/first.jpg", sort_order: 1 }),
    ];
    expect(primaryMediaUrl(rows)).toBe("https://a.example/first.jpg");
    expect(rows[0].media_url).toBe("https://a.example/late.jpg");
  });
});

describe("supplier-image rights gate", () => {
  it("flags a primary image on a supplier CDN", () => {
    expect(isSupplierImageUrl("https://img.kwcdn.com/product/x.jpg")).toBe(true);
    expect(
      hasSupplierImage([
        own({ media_url: "https://img.kwcdn.com/product/x.jpg", is_primary: true }),
      ]),
    ).toBe(true);
  });

  it("passes owned photos and empty urls", () => {
    expect(isSupplierImageUrl(own().media_url)).toBe(false);
    expect(isSupplierImageUrl(null)).toBe(false);
    expect(hasSupplierImage([])).toBe(false);
  });

  it("only the PRIMARY image gates: a supplier image further down does not", () => {
    const rows = [
      own({ sort_order: 0 }),
      own({ media_url: "https://img.kwcdn.com/product/x.jpg", sort_order: 1 }),
    ];
    expect(hasSupplierImage(rows)).toBe(false);
  });

  it("matches the production case: published listing whose only image is on kwcdn", () => {
    // frankincense-myrrh-resin-set, 2026-07-22: published in admin, absent
    // from the storefront.
    expect(
      hasSupplierImage([
        own({ media_url: "https://img.kwcdn.com/product/fancy/resin-set.jpg" }),
      ]),
    ).toBe(true);
  });
});
