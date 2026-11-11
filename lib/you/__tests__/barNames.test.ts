import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Two names never cross on You (1.9, 2026-11-11, the arbiter's word on a
 * finding of the Prayer campaigns chat).
 *
 * The You tab's bar is clear over the Ladder, and stayed clear until the
 * picture's foot had gone up under it. The reader stands on that picture:
 * their own picture, their name, the way to their profile. Scrolled, those
 * went up under a bar that was still clear, straight through the tab's name.
 * Measured on the export at a phone's width: from 140px of scroll the
 * reader's name stood in the bar's band, and the picture's foot was not due
 * for another 130px. On a short page, which cannot scroll the picture away,
 * they were left crossed at the page's end.
 *
 * Now the bar is solid again as soon as the reader's words reach its foot.
 * It turns as it always has (its own 200ms with Purify's motion on, at once
 * with it off), so nothing new moves. The walk on the export measures it;
 * this holds the wiring.
 *
 * What would go wrong if this broke: "You" and the reader's name written
 * over each other at the top of the tab.
 */

const ROOT = process.cwd();
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("the bar over a page's picture", () => {
  const hook = code("components/mobile/barOverPicture.ts");

  it("is solid again when the picture has gone or the words on it have reached the bar", () => {
    expect(hook).toContain("export function useBarOverPicture(picture: RefObject<HTMLElement | null>, words?: RefObject<HTMLElement | null>)");
    // Both are known before the first paint, so a page come back to scrolled never shows them crossed for a frame.
    expect(hook).toMatch(/let gone = el\.getBoundingClientRect\(\)\.bottom <= top;\s*let reached = first \? first\.getBoundingClientRect\(\)\.top < top : false;\s*solid\(gone \|\| reached\);/);
    // The words have reached the bar when their top is over its foot.
    expect(hook).toMatch(/else reached = entry\.boundingClientRect\.top < \(entry\.rootBounds\?\.top \?\? top\);/);
    expect(hook).toMatch(/if \(entry\.target === el\) gone = !entry\.isIntersecting;/);
    expect(hook).toMatch(/\}\s*solid\(gone \|\| reached\);\s*\},/);
  });

  it("is told by one observer, at the two edges, and by nothing while scrolling", () => {
    expect(hook.match(/new IntersectionObserver\(/g)).toHaveLength(1);
    // 0 for the picture leaving, 1 for the words no longer whole under the bar.
    expect(hook).toContain("{ rootMargin: `-${top}px 0px 0px 0px`, threshold: [0, 1] }");
    expect(hook).toMatch(/io\.observe\(el\);\s*if \(first\) io\.observe\(first\);/);
    expect(hook).not.toMatch(/addEventListener\("scroll"|requestAnimationFrame|setInterval/);
    // Taken back with the page, and solid where there is no way to know.
    expect(hook).toMatch(/return \(\) => \{\s*io\.disconnect\(\);\s*solid\(false\);/);
    expect(hook).toMatch(/typeof IntersectionObserver === "undefined"\) \{\s*solid\(true\);/);
  });

  it("turns in the bar's own motion: nothing new moves, and with motion off it is at once", () => {
    const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/:where\(\[data-motion="full"\]\) \[data-tab-topbar\] \{\s*transition-property: background-color, border-color;\s*transition-duration: 200ms;/);
    // No scroll-tied fade of the hero's words was added for this.
    const you = css.slice(css.indexOf(".you-hero-picture {"), css.indexOf(".you-hero-ring {"));
    expect(you).not.toMatch(/animation-timeline|view\(|scroll\(/);
  });
});

describe("the head of You", () => {
  const hero = code("components/you/YouHero.tsx");

  it("hands the bar the reader's own words, with a little room over their first line", () => {
    expect(hero).toMatch(/const words = useRef<HTMLDivElement>\(null\);\s*useBarOverPicture\(picture, words\);/);
    // Signed in or out, it is the same box: the name, or Sign in in the name's place.
    expect(hero).toMatch(/<div ref=\{words\} data-you-words="" className="-mt-3 pt-3">\s*<YouIdentity who=\{who\} \/>\s*<\/div>/);
    // The room is taken up and given back, so the words stand where they stood.
    const cls = /<div ref=\{words\} data-you-words="" className="([^"]+)"/.exec(hero)![1].split(" ");
    expect(cls.sort()).toEqual(["-mt-3", "pt-3"]);
  });

  it("has its twin on Prayers: the bar is handed the verse standing on the Pantocrator", () => {
    // The same fault, measured the same day: from 130px of scroll "Pray without ceasing." stood in the clear
    // bar's band, then "Your rule" after it, until the picture's foot had gone 230px later.
    const prayers = code("components/mobile/PrayersHero.tsx");
    expect(prayers).toMatch(/const words = useRef<HTMLQuoteElement>\(null\);\s*useBarOverPicture\(picture, words\);/);
    // The verse itself is watched, and stays a quotation with its source under it.
    expect(prayers).toMatch(/<blockquote ref=\{words\} data-prayers-words="" className="-mt-3 pt-3">/);
    expect(prayers).toMatch(/<\/blockquote>\s*<figcaption /);
  });
});
