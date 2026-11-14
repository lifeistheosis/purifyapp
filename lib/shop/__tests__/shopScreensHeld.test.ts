// The shop's two screens held to every checkMock rule (Updates 39, the
// arbiter's call of 2026-11-14: "a fault, whatever the data: the gate holds
// every screen to every rule, and the colours and hit areas are code").
//
// Measured with checkMock on /shop/ and the Virgin of Vladimir's page, with
// the main web's live set offer, at 390, 800 and 1032, on the 21, in English
// and Arabic, with the cart empty and with the set in it:
//   contrast  the set's "15% off as a set" and "The set ships free", 3.91 to
//             4.44:1 on Light and six light looks; the sidebar's "+ $4.99
//             standard shipping", 3.40 to 3.98:1 on Light and the seven; the
//             All chip's count, 4.33:1 on Mosaic; the drawer's "Your order
//             ships free" and its saving, 4.16 to 4.43:1 on Lavender, Olive and
//             Stone, and its offer tag, 3.75 to 4.46:1 on Light and the seven
//   target    "See all" 39.4 by 46.8px; the buy bar's box 17 by 17; the
//             drawer's "Remove" 41 by 17 and each piece's name 20px tall
//   palette   the demand dot's green and the set's "in your cart" border,
//             the same on Dark and on Light (typed, not the palette's)
//   cut       the set's piece names cut at two lines; the drawer's at one
//   mirror    the save heart and the set's plus signs placed with right and
//             left, the spec values and the buy bar's stock line set right,
//             the two doors at the foot padded on one physical side
// Each is read here as the code writes it, so the old code fails.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), "components/shop", f), "utf8");
const set = read("PrayerCornerSet.tsx");
const home = read("ShopHomeClient.tsx");
const bySaint = read("ShopBySaint.tsx");
const chips = read("CategoryChips.tsx");
const card = read("ProductCard.tsx");
const signals = read("CartSignals.tsx");
const bar = read("BuyBar.tsx");
const piece = read("ProductDetailClient.tsx");
const drawer = read("CartDrawer.tsx");

/** On Light and the light looks (all worn over data-reading-mode="parchment"). */
const ON_LIGHT = "[html[data-reading-mode=parchment]_&]:";

/** Every class list in a file that holds a given class. */
function listsWith(src: string, cls: RegExp): string[] {
  return [...src.matchAll(/(?:className=|\? |: )"([^"]*)"/g)].map((m) => m[1]).filter((l) => cls.test(l));
}

describe("the shop's greens on a light ground", () => {
  // Tailwind's pale greens take their deep shade on Light (app/globals.css,
  // --color-emerald-300 #047857), which still read 3.4 to 4.4:1 on the light
  // looks' grounds. Their deeper step (--color-emerald-200, #065f46 on Light,
  // 5.5:1 and up) is worn there; Dark keeps its own green.
  const greens = [
    ["PrayerCornerSet", set],
    ["BuyBar", bar],
    ["ProductCard", card],
    ["CartSignals", signals],
    ["CartDrawer", drawer],
  ] as const;
  for (const [name, src] of greens) {
    it(`${name}: every green word deepens on Light`, () => {
      const lists = listsWith(src, /\btext-emerald-300\b/);
      expect(lists.length, name).toBeGreaterThan(0);
      for (const l of lists) expect(l, `${name}: ${l}`).toContain(`${ON_LIGHT}text-emerald-200`);
    });
  }
  it("CartSignals: the ladder's done rows deepen on Light", () => {
    expect(/function DoneRow[\s\S]*?<li className="([^"]+)"/.exec(signals)?.[1]).toContain(`${ON_LIGHT}text-emerald-200`);
  });
  it("the greens that are a ground or an edge follow the palette on Light", () => {
    for (const [name, src] of [["ProductCard", card], ["CartSignals", signals], ["PrayerCornerSet", set], ["BuyBar", bar]] as const) {
      for (const l of listsWith(src, /\b(?:bg|border)-(?:emerald|sky)-[45]00\b/)) {
        // A faint wash (under a quarter, as checkMock's palette rule reads it) is not
        // read as a colour; anything stronger needs its Light value.
        const strong = [...l.matchAll(/(?<![:\w-])(bg|border)-(emerald|sky)-[45]00(?:\/(\d+)|\/\[([\d.]+)\])?(?![\w-])/g)].filter((m) => {
          const alpha = m[3] ? Number(m[3]) / 100 : m[4] ? Number(m[4]) : 1;
          return alpha >= 0.25;
        });
        for (const m of strong) expect(l, `${name}: ${m[0]}`).toMatch(new RegExp(`\\[html\\[data-reading-mode=parchment\\]_&\\]:${m[1]}-${m[2]}-300`));
      }
    }
  });
  it("the All chip's count reads 4.5:1 on Mosaic's paper (night at 65% or more)", () => {
    const alpha = Number(/gold \? "text-night\/(\d+)"/.exec(chips)?.[1]);
    expect(alpha).toBeGreaterThanOrEqual(65);
  });
});

describe("the shop's targets", () => {
  it("every See all reaches 44 by 44", () => {
    const links = [...`${home}\n${bySaint}`.matchAll(/className="([^"]+)"\s*>\s*\{t\("common\.seeAll"\)\}/g)].map((m) => m[1]);
    expect(links.length).toBe(3);
    for (const l of links) expect(l).toMatch(/\bhit-44\b/);
  });
  it("the buy bar's box has a 44 by 44 reach inside its label, said to checkMock", () => {
    const reach = /<span className="([^"]+)">\s*<input\s+ref=\{agreeRef\}[\s\S]*?\/>\s*<\/span>/.exec(bar);
    expect(reach, "a span round the box").toBeTruthy();
    expect(reach![1]).toMatch(/\bh-11\b/);
    expect(reach![1]).toMatch(/\bw-11\b/);
    expect(reach![0]).toContain('data-mock-allow="target"');
    expect(reach![0]).toMatch(/data-mock-why="[^"]{20,}"/);
  });
  it("the drawer's Remove reaches 44 by 44, and each name says where its 64px twin is", () => {
    expect(/className="([^"]+)"\s*>\s*\{t\("prayers\.diptychs\.remove"\)\}/.exec(drawer)?.[1]).toMatch(/\bhit-44\b/);
    expect(drawer).toMatch(/data-mock-allow="target"\s+data-mock-why="the piece's picture beside it, 64 by 64, opens the same page/);
  });
});

describe("the shop's names, whole", () => {
  it("the set's piece names are not clamped", () => {
    const name = /<p className="([^"]+)">\s*\{p\.title\}/.exec(set)?.[1];
    expect(name).toBeTruthy();
    expect(name).not.toMatch(/line-clamp|truncate/);
  });
  it("the drawer's piece names wrap, not end in an ellipsis", () => {
    const name = /className="([^"]+)"\s*>\s*\{item\.title\}/.exec(drawer)?.[1];
    expect(name).toBeTruthy();
    expect(name).not.toMatch(/\btruncate\b|line-clamp/);
  });
});

describe("the shop in Arabic", () => {
  it("the save heart stands at the card's end, and the set's plus signs at each piece's start", () => {
    expect(card).toMatch(/className="absolute end-2 top-2 [^"]*"/);
    expect(card).not.toMatch(/className="absolute right-2 top-2/);
    const plus = /<span\s+aria-hidden\s+className="(absolute [^"]+)"\s*>\s*<Plus/.exec(set)?.[1];
    expect(plus).toMatch(/\bstart-\[/);
    expect(plus).toMatch(/\brtl:translate-x-1\/2\b/);
    expect(plus).not.toMatch(/\bleft-\[/);
  });
  it("words are set to the end, not the right", () => {
    expect(/<dd className="([^"]+)">\{value\}<\/dd>/.exec(piece)?.[1]).toMatch(/\btext-end\b/);
    const stock = /<p className="([^"]+)">\s*\{inventoryLabel\}/.exec(bar)?.[1];
    expect(stock).toMatch(/\btext-end\b/);
    expect(stock).not.toMatch(/\btext-(?:right|left)\b/);
  });
  it("the two doors at the foot are padded and divided at start and end", () => {
    expect(home).toMatch(/<Link href="\/shop\/request" className="[^"]*\bmd:pe-10\b/);
    const sell = /href="\/shop\/sell"[\s\S]*?className="([^"]+)"/.exec(home)?.[1];
    expect(sell).toMatch(/\bmd:border-s\b/);
    expect(sell).toMatch(/\bmd:ps-10\b/);
    expect(sell).not.toMatch(/\bmd:(?:border-l|pl-10)\b/);
  });
});
