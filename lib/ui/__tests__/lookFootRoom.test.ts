import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { READING_THEMES } from "@/lib/reader/readingModes";

/**
 * A page ends above its look's foot (app/globals.css, "The page ends above
 * its foot"; 1.9).
 *
 * A look draws its picture over the last 240px of the screen. The app's
 * frame left room under a page for the bars alone, 86px, so a page's last
 * words came to rest inside the picture with nowhere higher to go: 88 of the
 * export's 123 screens on 2026-11-10. On a look with a foot the frame now
 * leaves the foot's own height under the page.
 *
 * scripts/last-words-walk.mjs measures every screen of the export. What can
 * be held without a browser is held here: that the room is the foot's own
 * length, on exactly the looks that have a foot, at exactly the widths the
 * foot is drawn at, and that it cannot drift from the frame's own sum.
 */
const css = readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** One rule's declarations, by its selector exactly as written. */
function body(selector: string): string {
  const at = css.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  return css.slice(at + selector.length + 2, css.indexOf("}", at)).trim();
}
const px = (block: string, name: string) => {
  const found = new RegExp(`${name}:\\s*(\\d+)px;`).exec(block);
  return found ? Number(found[1]) : null;
};

const NO_FOOT = '[data-look="nightsky"], [data-look="linen"]';
const WITH_FOOT = `html[data-look]:not(${NO_FOOT})`;
const looks = READING_THEMES.filter((t) => t.look).map((t) => t.id);

describe("the foot's own lengths", () => {
  it("the foot is drawn on every look but the two without one, and the room follows the same list", () => {
    expect(body(`${WITH_FOOT} body::after`)).toContain("background: var(--room);");
    expect(css).toContain(`html.is-native[data-look]:not(${NO_FOOT}) .safe-pb:not([data-foot-bar]) {`);
    expect(css).toContain(`html.is-native[data-look]:not(${NO_FOOT}) .safe-pb-reader {`);
    expect(css).toContain(`${WITH_FOOT} body > .min-h-screen:not(:has(.safe-pb)) {`);
    // No other list of looks anywhere near a foot: one place says which looks have none.
    expect(css.match(/html(?:\.is-native)?\[data-look\]:not\(([^)]*)\) (?:body::after|\.safe-pb|\.safe-pb-reader|body > \.min-h-screen)/g)?.every((rule) => rule.includes(NO_FOOT))).toBe(true);
  });

  it("each look with a foot says how tall it is, taller than the bars it stands behind", () => {
    const tabBar = px(body("html.is-native"), "--tab-bar-h");
    expect(tabBar).toBe(86);
    for (const id of looks) {
      const block = body(`html[data-look="${id}"]`);
      const clear = px(block, "--foot-clear");
      const solid = px(block, "--foot-solid");
      if (id === "nightsky" || id === "linen") {
        expect(clear, id).toBeNull();
        continue;
      }
      expect(clear, id).not.toBeNull();
      expect(solid, id).not.toBeNull();
      expect(clear!, id).toBeGreaterThan(solid!);
      // The room is the larger of the bars and the foot: with no mini player up it is the foot.
      expect(clear!, id).toBeGreaterThan(tabBar!);
    }
    // Twelve looks with a foot, of the fourteen (Desert came out, 2026-11-13).
    expect(looks.filter((id) => id !== "nightsky" && id !== "linen")).toHaveLength(12);
  });
});

describe("the room under a page on a look with a foot", () => {
  const phone = css.slice(css.indexOf(`@media (max-width: 767.98px) {\n html.is-native[data-look]:not(${NO_FOOT}) .safe-pb:not([data-foot-bar]) {`));

  it("is the frame's own room or the foot's height, whichever is taller", () => {
    const frame = /padding-bottom:\s*([^;]+);/.exec(body("html.is-native .safe-pb"))?.[1];
    const reader = /padding-bottom:\s*([^;]+);/.exec(body("html.is-native .safe-pb-reader"))?.[1];
    expect(frame).toBe("calc(var(--inset-bottom) + var(--tab-bar-h) + var(--now-playing-h) + var(--readings-flow-h))");
    expect(reader).toBeTruthy();
    const foot = "calc(var(--inset-bottom) + var(--foot-clear))";
    // The frame's sum is written again inside max(): if the frame's rule changes, this fails until the look's does too.
    expect(body(`html.is-native[data-look]:not(${NO_FOOT}) .safe-pb:not([data-foot-bar])`)).toBe(`padding-bottom: max(${frame}, ${foot});`);
    expect(body(`html.is-native[data-look]:not(${NO_FOOT}) .safe-pb-reader`)).toBe(`padding-bottom: max(${reader}, ${foot});`);
  });

  it("is the foot's height under the sign-in pages, which stand outside the frame", () => {
    expect(body(`${WITH_FOOT} body > .min-h-screen:not(:has(.safe-pb))`)).toBe("padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--foot-clear));");
    // That rule is for a shell with no frame inside it, and the sign-in pages' shell is one.
    const auth = readFileSync("app/(auth)/layout.tsx", "utf8");
    expect(auth).toContain('<div className="min-h-screen flex flex-col bg-night">');
    expect(auth).not.toContain("safe-pb");
    // The frame and Today carry the frame's own class, so the first rule answers for them.
    expect(readFileSync("components/layout/AppFrame.tsx", "utf8")).toContain('<main data-route-content className="flex-1 safe-pt safe-pb">');
    expect(readFileSync("app/page.tsx", "utf8")).toContain('<div data-route-content className="flex-1 safe-pt safe-pb">');
  });

  it("stands only at the widths the foot is drawn at", () => {
    expect(phone.startsWith("@media (max-width: 767.98px) {")).toBe(true);
    // The phone's block, to its own closing brace.
    let depth = 0;
    let end = 0;
    for (let i = phone.indexOf("{"); i < phone.length; i++) {
      if (phone[i] === "{") depth++;
      else if (phone[i] === "}" && --depth === 0) {
        end = i + 1;
        break;
      }
    }
    const block = phone.slice(0, end);
    expect(block.match(/padding-bottom:[^;]*var\(--foot-clear\)/g)).toHaveLength(3);
    // Nothing outside it gives a page room for a foot: from 768px the foot stands down, and so does the room.
    expect(css.replace(block, "")).not.toMatch(/padding-bottom:[^;]*var\(--foot-clear\)/);
    const wide = css.slice(css.indexOf("@media (min-width: 768px) {\n html[data-look]:not([data-look=\"nightsky\"]) body::before,"));
    expect(wide).toMatch(/^@media \(min-width: 768px\) \{\s*html\[data-look\]:not\(\[data-look="nightsky"\]\) body::before,\s*html\[data-look\] body::after \{\s*display: none;/);
  });
});

describe("a bar fixed at the screen's foot, on a look with a foot", () => {
  // The shop's buy bar carried .safe-pb, and on a look with a foot that gave it the foot's room, 240px under its
  // buttons, not the bars' 86: on 12 of the 14 looks it stood about 380px tall at 390 wide (465 to 844 on Jordan),
  // and with the ask line shown it covered "Carved wood" in the middle of the wall cross's page (Gate 2,
  // 2026-11-14). The cart's bar is the same bar. A bar is not a page: its own ground covers the foot.
  const phone = css.slice(css.indexOf("@media (max-width: 767.98px) {\n html.is-native[data-look]"));
  const block = phone.slice(0, phone.indexOf("\n}\n") + 3);
  const z = (rule: string) => Number(/z-index:\s*(\d+);/.exec(rule)?.[1]);

  it("keeps the frame's room under its buttons, the bars alone, not the foot's", () => {
    // The look's room is for a page: every .safe-pb but a foot bar.
    expect(block).toContain(`html.is-native[data-look]:not(${NO_FOOT}) .safe-pb:not([data-foot-bar]) {`);
    expect(css).not.toContain(`html.is-native[data-look]:not(${NO_FOOT}) .safe-pb {`);
    // So a foot bar takes the frame's own rule (inset, tab bar, mini player, readings flow), and nothing gives it
    // the foot's length.
    expect(body("html.is-native .safe-pb")).not.toContain("--foot-clear");
    const marked = css.replaceAll(":not([data-foot-bar])", "").match(/[^{}]*\[data-foot-bar\][^{}]*\{[^}]*\}/g) ?? [];
    expect(marked.length).toBeGreaterThan(1);
    for (const rule of marked) expect(rule).not.toContain("--foot-clear");
  });

  it("stands over the foot, under the cart's scrim and the tab bar, at the widths the foot is drawn at", () => {
    const foot = z(body(`${WITH_FOOT} body::after`));
    expect(foot).toBe(35);
    const bar = z(body(`${WITH_FOOT} .safe-pb[data-foot-bar]`));
    expect(block).toContain(`${WITH_FOOT} .safe-pb[data-foot-bar] {`);
    expect(bar).toBeGreaterThan(foot);
    // The cart's scrim (z-40) dims the page and its bar while the drawer is open; the tab bar is z-50.
    const drawer = readFileSync("components/shop/CartDrawer.tsx", "utf8");
    expect(drawer).toContain('"fixed inset-0 z-40 bg-night/60');
    expect(bar).toBeLessThan(40);
  });

  it("is the shop's buy bar and the cart's: fixed at the foot, each marked a foot bar on its own element", () => {
    for (const file of ["components/shop/BuyBar.tsx", "components/shop/CartClient.tsx"]) {
      const src = readFileSync(file, "utf8");
      const at = src.indexOf("data-foot-bar");
      expect(at, file).toBeGreaterThan(-1);
      // The element that carries the mark carries the fixed bar's classes too (its className follows within it).
      const el = src.slice(at, src.indexOf(">", src.indexOf("className", at)));
      expect(el, file).toMatch(/fixed inset-x-0 bottom-0 z-30 [^"]*safe-pb/);
    }
  });
});

describe("the walk that measures every screen's last words", () => {
  // On 2026-11-13 the walk failed /saints/ on every look with a foot ("Cyrus, a physician of Alexandria, and John,"
  // 207px inside it): a saint card's life is clamped to three lines, the browser still lays out every line of it,
  // and the walk cut a line by the boxes around its words but not by the words' own box. The page ended 51px above
  // its foot. The walk now starts at the words' own box, and proves its measure on pages of its own first.
  const walk = readFileSync("scripts/last-words-walk.mjs", "utf8");
  const shown = walk.slice(walk.indexOf("const shown = (el, top, bottom) => {"), walk.indexOf("const drawn = (el)"));

  it("cuts a line by its own box first, then by every box around it", () => {
    expect(shown).toContain("for (let p = el; p && p !== document.body; p = p.parentElement) {");
    expect(shown).not.toContain("el.parentElement;");
  });

  it("proves its measure before every walk: a clamped life passes, words and a button in the foot fail", () => {
    expect(walk).toMatch(/const proved = await selfTest\(browser\);\nif \(SELF_TEST \|\| !proved\) \{/);
    const cases = walk.slice(walk.indexOf("const CASES = ["), walk.indexOf("async function selfTest"));
    expect(cases).toMatch(/clamped to three lines[\s\S]*?-webkit-line-clamp:3;overflow:hidden[\s\S]*?false,/);
    expect(cases).toMatch(/a paragraph whose last line rests in the foot[\s\S]*?true,/);
    expect(cases).toMatch(/a button resting in the foot[\s\S]*?true,/);
    // A phone lays a page with no viewport of its own out 980px wide, where the clamped life is five lines and
    // the old measure passed it too.
    expect(walk).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  });
});
