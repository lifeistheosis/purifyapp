import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The shop's floating cart button in Arabic (1.9, found by Updates 22's
 * checkMock on the export of 968347b3, 2026-11-13): on /shop/request/ at 800
 * and 1032 wide, "Open cart" stayed at the bottom right when the page turned
 * to Arabic (checkMock's mirror rule), because it was placed by the right
 * (right-6). Its count badge sat on its right shoulder (-right-1). The
 * website's back-to-top button shares that corner and was placed by the right
 * too (right-7), with globals.css lifting it above the cart by `right: 30px`,
 * so mirroring the cart alone would have split the pair in Arabic.
 *
 * What it holds: both buttons and the badge are placed by the end, never by a
 * physical side, and the rule that stacks back-to-top above the cart nudges it
 * by the end too.
 *
 * What a reader would notice if this broke: in Arabic on a tablet or the
 * website, the cart button on the side the words begin from, or back-to-top
 * standing apart from it on the other side.
 */

const read = (file: string) =>
  fs
    .readFileSync(path.join(process.cwd(), file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PHYSICAL = /(^|\s)-?(right|left)-\S+/;

describe("the cart button and back-to-top in Arabic", () => {
  it("the cart button and its count are placed by the end", () => {
    const code = read("components/shop/CartFab.tsx");
    const classes = [...code.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
    const button = classes.find((c) => /(^|\s)fixed(\s|$)/.test(c)) ?? "";
    const badge = classes.find((c) => c.includes("badge-bump")) ?? "";
    for (const c of classes) expect(c).not.toMatch(PHYSICAL);
    expect(button).toMatch(/(^|\s)end-6(\s|$)/);
    expect(badge).toMatch(/(^|\s)-end-1(\s|$)/);
  });

  it("back-to-top is placed by the end", () => {
    const code = read("components/nav/ScrollToTop.tsx");
    const base = code.match(/"back-to-top [^"]*"/)?.[0] ?? "";
    expect(base).toMatch(/(^|\s)end-7(\s|$)/);
    expect(base).not.toMatch(PHYSICAL);
  });

  it("stacked above the cart, back-to-top is nudged by the end", () => {
    const css = read("app/globals.css");
    const rule = css.match(/html\.has-cart-fab \.back-to-top \{([^}]*)\}/)?.[1] ?? "";
    expect(rule).toMatch(/inset-inline-end:\s*30px/);
    expect(rule).not.toMatch(/(^|[\s;])(right|left):/);
  });
});
