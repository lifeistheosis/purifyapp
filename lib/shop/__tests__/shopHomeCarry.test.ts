// Every card on the shop's front page that opens a piece's page carries its
// picture into it (CLAUDE.md, "Every page switch is a transition", the
// owner's word of 2026-11-10). Gate 2's fault 7 (2026-11-14): the featured
// icon at the top of /shop/, the Virgin of Vladimir, opened
// /shop/icons/detail/ with no picture carried, because its link held its
// picture with no name to travel by; the motion walk saw only (root) and
// (tab-bar). The piece's page takes a picture by the piece's name
// (components/shop/ShopStates.tsx, components/shop/ProductGallery.tsx), so a
// picture inside a link to a piece wears that name too (lib/ui/routeMotion.ts,
// pictureOf), and a link stretched over its card with nothing inside it
// carries its card's picture (components/shop/ProductCard.tsx).
//
// Read from the front page itself: every shop component it imports, so a card
// added to it later is held to the same rule.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const HOME = "components/shop/ShopHomeClient.tsx";

/** The shop components the front page renders, and the front page. */
function homeFiles(): string[] {
  const src = read(HOME);
  const imported = [...src.matchAll(/from "@\/components\/shop\/(\w+)"/g)].map((m) => `components/shop/${m[1]}.tsx`);
  return [HOME, ...imported].filter((rel) => fs.existsSync(path.join(process.cwd(), rel)));
}

/** Where the opening tag that starts at `start` ends, braces and strings skipped. */
function openingTag(src: string, start: number): { end: number; selfClosing: boolean } {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (c === ">" && depth === 0) return { end: i + 1, selfClosing: src[i - 1] === "/" };
  }
  throw new Error(`an opening tag at ${start} never closes`);
}

type PieceLink = { file: string; line: number; slug: string; selfClosing: boolean; body: string };

/** Every <Link> whose address is a piece's page (lib/shop/productHref.ts), with what it holds. */
function pieceLinks(file: string): PieceLink[] {
  const src = read(file);
  const out: PieceLink[] = [];
  for (const m of src.matchAll(/<Link\b/g)) {
    const start = m.index ?? 0;
    const tag = openingTag(src, start);
    const head = src.slice(start, tag.end);
    const href = /href=\{productHref\(([^,)]+)/.exec(head);
    if (!href) continue;
    let body = "";
    if (!tag.selfClosing) {
      const close = src.indexOf("</Link>", tag.end);
      if (close < 0) throw new Error(`${file}: a <Link> never closes`);
      body = src.slice(tag.end, close);
    }
    out.push({ file, line: src.slice(0, start).split("\n").length, slug: href[1].trim(), selfClosing: tag.selfClosing, body });
  }
  return out;
}

const PICTURE = /<(Image|VitrineImage|img)\b/;

describe("every card on /shop/ that opens a piece carries its picture into the piece's page", () => {
  const links = homeFiles().flatMap(pieceLinks);

  it("finds the front page's links to a piece: the featured icon, the cards, the feast, the set, where they left off", () => {
    const files = new Set(links.map((l) => l.file));
    for (const want of [
      "components/shop/FeaturedIcon.tsx",
      "components/shop/ProductCard.tsx",
      "components/shop/FeastBand.tsx",
      "components/shop/PrayerCornerSet.tsx",
      HOME,
    ]) {
      expect(files, want).toContain(want);
    }
  });

  it("a link that holds its picture names it by the piece the link opens", () => {
    const holding = links.filter((l) => !l.selfClosing && PICTURE.test(l.body));
    expect(holding.length).toBeGreaterThanOrEqual(4);
    for (const l of holding) {
      const at = `${l.file}:${l.line}`;
      const named = /data-carry=\{pieceCarry\(([^)]+)\)\}/.exec(l.body);
      expect(named, `${at}: its picture has no name to travel by`).not.toBeNull();
      expect(named![1].trim(), `${at}: its picture travels by another piece's name`).toBe(l.slug);
    }
  });

  it("a link stretched over its card carries the card's own picture, named by the same piece", () => {
    const stretched = links.filter((l) => l.selfClosing);
    expect(stretched.length).toBeGreaterThanOrEqual(1);
    for (const l of stretched) {
      const src = read(l.file);
      expect(src, `${l.file}:${l.line}`).toContain(`data-carry={pieceCarry(${l.slug})}`);
    }
  });

  it("the export's page for a piece takes the picture even when its outline commits before its body", () => {
    // Measured on the export: one tap in two, card by card, the router committed the route's own fallback (its
    // body's code still arriving), the bare outline, and the card's picture left with the shop.
    const page = read("app/(app)/shop/icons/detail/page.tsx");
    expect(page).toContain("<Suspense fallback={<ProductDetailFallback />}>");
    expect(page).not.toContain("fallback={<ShopDetailSkeleton />}");
    const query = read("components/shop/ProductDetailFromQuery.tsx");
    const fallback = query.slice(query.indexOf("export function ProductDetailFallback"));
    // The piece being opened, from the address the tap named (the router writes it only as the page commits); none
    // on the server and on a cold start's first draw, so the page hydrates as it was written.
    expect(fallback).toContain('useSyncExternalStore(still, () => new URLSearchParams(searchFor(DETAIL)).get("slug") ?? "", () => "")');
    expect(fallback).toContain("<ShopDetailSkeleton picture={slug ? peekPiecePicture(slug) : null} carry={slug ? pieceCarry(slug) : undefined} />");
    expect(query).toContain('const DETAIL = "/shop/icons/detail";');
  });

  it("the piece's page takes a picture by the piece's name, while it is read and once it is", () => {
    expect(read("components/shop/ProductDetailClient.tsx")).toContain("<ShopDetailSkeleton picture={peekPiecePicture(slug)} carry={pieceCarry(slug)} />");
    expect(read("components/shop/ProductDetailClient.tsx")).toContain("carry={pieceCarry(product.slug)}");
    expect(read("components/shop/ShopStates.tsx")).toContain("<div data-carry-into={carry}");
    expect(read("components/shop/ProductGallery.tsx")).toContain("data-carry-into={i === 0 ? carry : undefined}");
  });
});
