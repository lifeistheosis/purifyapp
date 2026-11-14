// A card that opens its own page carries its picture into it (CLAUDE.md, the
// owner's word of 2026-11-10). The shop's piece did not (Updates 37's Open 4):
// its page reads the piece after it opens, so at the switch nothing on it
// could take the card's picture, and the card's link, stretched over the card
// with nothing inside it (its heart and its cart are buttons), had no picture
// to lift. Now the card's picture wears the piece's name, the stretched link
// carries its card's picture (lib/ui/routeMotion.ts, pictureOf), and the
// piece's outline shows the picture a list already read, where the gallery's
// first will stand, and takes the card's (Updates 38).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const home = {
  rails: [
    {
      title: "New",
      products: [
        { slug: "virgin-of-vladimir", store: { slug: "eikon" }, media: [{ media_url: "https://purifyapp.net/shop/vladimir.png", alt_text: "The Virgin of Vladimir" }] },
        { slug: "saint-nicholas", store: { slug: "eikon" }, media: [] },
      ],
    },
  ],
  store: { slug: "plain-store" },
};

vi.mock("@/lib/api/client", () => ({
  apiFetch: async () => ({ ok: true, status: 200, json: async () => home }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/media/streamed", () => ({ streamedDeep: <T,>(v: T) => v }));

import { fetchShopHome, peekPiecePicture } from "@/lib/shop/catalogClient";
import { pieceCarry } from "@/lib/shop/productHref";

const code = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("the shop's piece carries its picture into its page", () => {
  it("finds the first picture of a piece a list already read, and nothing it has not", async () => {
    expect(peekPiecePicture("virgin-of-vladimir")).toBeNull();
    await fetchShopHome();
    expect(peekPiecePicture("virgin-of-vladimir")).toEqual({ url: "https://purifyapp.net/shop/vladimir.png", alt: "The Virgin of Vladimir" });
    // A piece with no picture, a store that shares a name, a slug never read.
    expect(peekPiecePicture("saint-nicholas")).toBeNull();
    expect(peekPiecePicture("plain-store")).toBeNull();
    expect(peekPiecePicture("unknown")).toBeNull();
    expect(peekPiecePicture("")).toBeNull();
  });

  it("names the travel by the piece", () => {
    expect(pieceCarry("virgin-of-vladimir")).toBe("piece:virgin-of-vladimir");
  });

  it("the card's picture, the outline's and the gallery's first wear the one name", () => {
    expect(code("components/shop/ProductCard.tsx")).toContain('<div data-carry={pieceCarry(product.slug)} className="absolute inset-0">');
    const states = code("components/shop/ShopStates.tsx");
    expect(states).toContain('<div data-carry-into={carry} className="absolute inset-0">');
    expect(code("components/shop/ProductDetailClient.tsx")).toContain("<ShopDetailSkeleton picture={peekPiecePicture(slug)} carry={pieceCarry(slug)} />");
    expect(code("components/shop/ProductDetailClient.tsx")).toContain("carry={pieceCarry(product.slug)}");
    expect(code("components/shop/ProductGallery.tsx")).toContain("data-carry-into={i === 0 ? carry : undefined}");
  });

  it("the outline's picture stands where the gallery draws its first, drawn as the gallery draws it", () => {
    const gallery = code("components/shop/ProductGallery.tsx");
    const states = code("components/shop/ShopStates.tsx");
    const look = 'className="object-contain p-5 drop-shadow-[0_26px_30px_rgba(0,0,0,0.5)] md:p-10"';
    expect(gallery).toContain(look);
    expect(states).toContain(look);
    expect(gallery).toContain('sizes="(min-width: 768px) 560px, 100vw"');
    expect(states).toContain('sizes="(min-width: 768px) 560px, 100vw"');
  });
});
