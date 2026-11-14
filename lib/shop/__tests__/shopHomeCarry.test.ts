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

type PieceLink = { file: string; line: number; slug: string; selfClosing: boolean; head: string; body: string };

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
    out.push({ file, line: src.slice(0, start).split("\n").length, slug: href[1].trim(), selfClosing: tag.selfClosing, head, body });
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

  it("from one piece to another on the export's page, the piece being opened arrives as itself, with its picture to take the card's", () => {
    // Updates 62: the body was not keyed, so the piece being left stayed on
    // screen under the new address until the new one was read (filmed on the
    // export: half a second), and no picture of the new piece was there to
    // take the card's.
    const src = read("components/shop/ProductDetailFromQuery.tsx");
    expect(src).toContain("<ProductDetailClient key={slug} slug={slug} />");
  });

  it("the row of pieces looked at before reads each title whole, never cut by an ellipsis", () => {
    // checkMock on the export at 390 (Updates 46): "Orthodox Cross Beanie" ended by an ellipsis in the row.
    const home = read(HOME);
    const thumb = home.slice(home.indexOf("function Thumb("));
    expect(thumb).toContain('<p className="mt-2 font-sans text-caption text-paper/70">{product.title}</p>');
    expect(thumb.slice(0, thumb.indexOf("</Link>"))).not.toMatch(/\btruncate\b|line-clamp/);
  });

  it("the piece's page takes a picture by the piece's name, while it is read and once it is", () => {
    expect(read("components/shop/ProductDetailClient.tsx")).toContain("<ShopDetailSkeleton picture={peekPiecePicture(slug)} carry={pieceCarry(slug)} />");
    expect(read("components/shop/ProductDetailClient.tsx")).toContain("carry={pieceCarry(product.slug)}");
    expect(read("components/shop/ShopStates.tsx")).toContain("<div data-carry-into={carry}");
    expect(read("components/shop/ProductGallery.tsx")).toContain("data-carry-into={i === 0 ? carry : undefined}");
  });
});

// Updates 46's Open 1 (Updates 64, 2026-11-14): the same gap off /shop/. Each
// of these held its picture in a link to a piece with no name to travel by, so
// the tapped card's picture stayed behind and the piece's page arrived alone.
const ELSEWHERE = [
  "components/shop/SaintIconsRail.tsx", // a saint's page (the website's; it renders nothing in the apps)
  "components/shop/eikon/EikonBoutique.tsx", // /shop/eikon/
  "components/shop/SetFinish.tsx", // the cart, the pieces that finish a prayer corner set
  "components/shop/CartClient.tsx", // the cart's rows
  "components/shop/OrderBump.tsx", // the cart, and the thank-you page
];
const DRAWER = "components/shop/CartDrawer.tsx";
const SET = "components/shop/SetFinish.tsx";

const holdingPicture = (l: PieceLink) => !l.selfClosing && PICTURE.test(l.body);

describe("off /shop/, every link to a piece that holds its picture carries it into the piece's page", () => {
  const links = ELSEWHERE.flatMap(pieceLinks);

  it("finds a link to a piece holding its picture in each: the saint's rail, EIKON, the set, the cart's rows, the bump", () => {
    for (const file of ELSEWHERE) expect(links.filter((l) => l.file === file && holdingPicture(l)).length, file).toBeGreaterThan(0);
  });

  it("names its picture by the piece the link opens", () => {
    for (const l of links.filter(holdingPicture)) {
      const at = `${l.file}:${l.line}`;
      const named = /data-carry=\{([^}]*)\}/.exec(l.body);
      expect(named, `${at}: its picture has no name to travel by`).not.toBeNull();
      expect(named![1], `${at}: its picture travels by another piece's name`).toContain(`pieceCarry(${l.slug})`);
    }
  });
});

describe("the cart drawer closes as a piece opens from it, and its pictures stay", () => {
  // Read, not walked: the drawer starts its 300ms slide away on the tap, before
  // the page being left is pictured, so a picture lifted from it would leave
  // from wherever the slide had taken it, not from under the finger; and on the
  // way back it would fly into the closed drawer, beyond the screen's edge
  // (routeMotion's carryBack finds the same link again). So nothing in the
  // drawer carries until the drawer closes with the page instead of the tap.
  it("its rows close it, and carry nothing", () => {
    const rows = pieceLinks(DRAWER).filter(holdingPicture);
    expect(rows.length).toBeGreaterThan(0);
    for (const l of rows) {
      expect(l.head, `${l.file}:${l.line}`).toContain("onClick={close}");
      expect(l.body, `${l.file}:${l.line}`).not.toContain("data-carry");
    }
  });

  it("the set it offers closes it too (it opened the piece under the open drawer), and its pictures do not travel out of it", () => {
    expect(read(DRAWER)).toMatch(/<SetFinish\b[^>]*\bonOpenPiece=\{close\}/);
    const links = pieceLinks(SET);
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const l of links) expect(l.head, `${l.file}:${l.line}`).toContain("onClick={onOpenPiece}");
    expect(read(SET)).toContain("data-carry={onOpenPiece ? undefined : pieceCarry(p.slug)}");
  });
});
