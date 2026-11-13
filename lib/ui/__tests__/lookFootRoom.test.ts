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
    expect(css).toContain(`html.is-native[data-look]:not(${NO_FOOT}) .safe-pb {`);
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
    // Thirteen looks with a foot, of the fifteen.
    expect(looks.filter((id) => id !== "nightsky" && id !== "linen")).toHaveLength(13);
  });
});

describe("the room under a page on a look with a foot", () => {
  const phone = css.slice(css.indexOf(`@media (max-width: 767.98px) {\n html.is-native[data-look]:not(${NO_FOOT}) .safe-pb {`));

  it("is the frame's own room or the foot's height, whichever is taller", () => {
    const frame = /padding-bottom:\s*([^;]+);/.exec(body("html.is-native .safe-pb"))?.[1];
    const reader = /padding-bottom:\s*([^;]+);/.exec(body("html.is-native .safe-pb-reader"))?.[1];
    expect(frame).toBe("calc(var(--inset-bottom) + var(--tab-bar-h) + var(--now-playing-h) + var(--readings-flow-h))");
    expect(reader).toBeTruthy();
    const foot = "calc(var(--inset-bottom) + var(--foot-clear))";
    // The frame's sum is written again inside max(): if the frame's rule changes, this fails until the look's does too.
    expect(body(`html.is-native[data-look]:not(${NO_FOOT}) .safe-pb`)).toBe(`padding-bottom: max(${frame}, ${foot});`);
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
