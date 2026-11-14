// The cart and the checkout's thank-you page held to every checkMock rule
// (Updates 40, the arbiter's routing of 2026-11-14, after Updates 39 named
// them). Measured with checkMock on /shop/cart/ with the Virgin of Vladimir in
// it and with the prayer corner set in it, and on the thank-you page with its
// follow-up offer, at 390, 800 and 1032, on the 21, in English and Arabic:
//   target    the agree box 17 by 17 (the checkout's clickwrap); the piece's
//             name 38.5px tall; the set's two names 18.6px; the follow-up's
//             and the order bump's name 20px; Remove 19.5px wide in Arabic
//   cut       the piece's name cut at two lines at 800; the set's names and
//             the follow-up's ended by an ellipsis
//   mirror    each discounted line's price set right; the follow-up offer's
//             heading, name and price set left
//   contrast  the savings, "Your order ships free" and the order bump's
//             offer price in a pale green, 3.68 to 3.89:1 on Light and the
//             light palettes; the struck prices at 40% of the ink, 2.26:1 on
//             Light and 3.8:1 on Dark (the house's struck price is 45%,
//             which every palette raises)
// Each is read here as the code writes it, so the old code fails. The agree
// box is the checkout's clickwrap (AGENTS.md, money safeguards): only its
// reach changed, and what it guards is read here too.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), "components/shop", f), "utf8");
const cart = read("CartClient.tsx");
const finish = read("SetFinish.tsx");
const bump = read("OrderBump.tsx");
const thanks = read("CheckoutSuccessClient.tsx");
const drawer = read("CartDrawer.tsx");

const ON_LIGHT = "[html[data-reading-mode=parchment]_&]:";
/** Tailwind's spacing step in px (0.25rem a step). */
const px = (cls: string, name: string) => {
  const m = new RegExp(`(?:^|\\s)${name}-(\\d+(?:\\.\\d+)?)(?=\\s|$)`).exec(cls);
  return m ? Number(m[1]) * 4 : NaN;
};

describe("the cart's agree box", () => {
  const reach = /<span className="([^"]+)">\s*<input\s+ref=\{agreeRef\}[\s\S]*?\/>\s*<\/span>/.exec(cart);

  it("has a 44 by 44 reach inside its label, said to checkMock", () => {
    expect(reach, "a span round the box").toBeTruthy();
    expect(reach![1]).toMatch(/\bh-11\b/);
    expect(reach![1]).toMatch(/\bw-11\b/);
    expect(reach![0]).toContain('data-mock-allow="target"');
    expect(reach![0]).toMatch(/data-mock-why="[^"]{20,}"/);
  });

  it("reaches over neither the part above nor Check out, and leaves the box and the label as drawn", () => {
    const cls = reach![1];
    const rise = px(cls, "-mt");
    const fall = px(cls, "-mb");
    const top = px(cls, "pt");
    const label = /<label\s+className=\{cn\(\s*"([^"]+)"/.exec(cart)?.[1] ?? "";
    const checkOut = /<button\s+ref=\{checkoutRef\}[\s\S]*?className="([^"]+)"/.exec(cart)?.[1] ?? "";
    // Into the label's own gap above, no further.
    expect(rise).toBeLessThanOrEqual(px(label, "mt"));
    // The box 0.125rem below the line's top, as it was drawn (mt-0.5).
    expect(top - rise).toBe(2);
    // The label no taller than one line of its words (text-caption at 1.5, 18px).
    expect(44 - rise - fall).toBe(18);
    // Below a one-line label it stops short of Check out (its own gap above).
    expect(44 - rise - 18).toBeLessThanOrEqual(px(checkOut, "mt"));
    // Across: centred on the box, its margins giving the row back the box's 16px.
    expect(cls).toMatch(/(?:^|\s)-mx-3\.5(?=\s)/);
  });

  it("still guards the order: unticked, Check out asks first, and the order says the terms were accepted", () => {
    expect(cart).toMatch(/onChange=\{\(e\) => \{\s*setAgreed\(e\.target\.checked\);/);
    expect(cart).toMatch(/async function checkout\(\) \{\s*if \(!agreed\) \{\s*askForAgreement\(\);\s*return;\s*\}/);
    expect(cart).toContain("termsAccepted: true,");
    expect(cart).toMatch(/if \(agreed && !checkoutOff\) \{\s*void checkout\(\);/);
  });
});

describe("the names, whole, and the small controls' reach", () => {
  const names: [string, string, RegExp][] = [
    ["the cart's piece", cart, /data-mock-allow="target"\s+data-mock-why="([^"]+)"\s+className="([^"]+)"\s*>\s*\{item\.title\}/],
    ["the set's pieces", finish, /data-mock-allow="target"\s+data-mock-why="([^"]+)"\s+className="([^"]+)"\s*>\s*\{p\.title\}/],
    ["the order bump's piece", bump, /data-mock-allow="target"\s+data-mock-why="([^"]+)"\s+className="([^"]+)"\s*>\s*\{product\.title\}/],
  ];
  for (const [name, src, re] of names) {
    it(`${name}: the name wraps whole and says where its picture twin is`, () => {
      const m = re.exec(src);
      expect(m, name).toBeTruthy();
      expect(m![1]).toMatch(/^the piece's picture beside it, \d+ by \d+.*opens the same page/);
      expect(m![2]).not.toMatch(/\btruncate\b|line-clamp/);
      expect(m![2]).toMatch(/\bbreak-words\b/);
    });
  }

  it("Remove reaches 44 by 44 in every language", () => {
    expect(/className="([^"]+)"\s*>\s*\{t\("prayers\.diptychs\.remove"\)\}/.exec(cart)?.[1]).toMatch(/\bhit-44\b/);
  });
});

describe("start and end, not left and right", () => {
  it("each discounted line's price is set to the end", () => {
    const price = /\{lineTotal < listTotal \? \(\s*<p className="([^"]+)">/.exec(cart)?.[1];
    expect(price).toMatch(/\btext-end\b/);
  });
  it("no word in the cart, the order bump or the thank-you page is set left or right", () => {
    for (const src of [cart, bump, thanks]) expect(src).not.toMatch(/\btext-(?:left|right)\b/);
    expect(thanks).toMatch(/max-w-\[420px\] text-start"/);
  });
  it("the struck prices keep their space at the end side, and the steppers round at start and end", () => {
    for (const src of [cart, bump]) {
      expect(src).not.toMatch(/\bmr-1\.5\b/);
      expect(src).toMatch(/\bme-1\.5 text-paper\/45 line-through\b/);
    }
    for (const src of [cart, drawer]) {
      expect(src).not.toMatch(/\brounded-[lr]-pill\b/);
      expect(src).toMatch(/\brounded-s-pill\b/);
      expect(src).toMatch(/\brounded-e-pill\b/);
    }
  });
});

describe("the cart's colours on every palette", () => {
  it("every green word deepens on Light and the light looks", () => {
    for (const [name, src] of [["CartClient", cart], ["OrderBump", bump]] as const) {
      const lists = [...src.matchAll(/className="([^"]*\btext-emerald-300\b[^"]*)"/g)].map((m) => m[1]);
      expect(lists.length, name).toBeGreaterThan(0);
      for (const l of lists) expect(l, `${name}: ${l}`).toContain(`${ON_LIGHT}text-emerald-200`);
    }
  });
  it("no struck price is fainter than the house's 45%", () => {
    for (const src of [cart, bump]) expect(src).not.toMatch(/text-paper\/40 line-through/);
  });
});
