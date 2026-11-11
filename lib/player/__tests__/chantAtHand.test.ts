import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { TOP_PLATE } from "@/components/nav/topPlate";
import { chantAtHand, offerChantAtHand, onChantAtHand, openChantAtHand } from "@/lib/player/chantAtHand";

/**
 * The chant at hand (1.9, fresh eyes L1, docs/1.9-build/notes/fresh-eyes.md):
 * "The Hours: 'Pray with chant' floats over the prayer's words ... a pill
 * sits mid-screen across a line of the Trisagion. A floating pill where it
 * does not belong." His rule of 2026-11-10 (CLAUDE.md, "Floating pills only
 * where they belong") keeps such a pill out, and his 1.8 pick B wanted the
 * chant one tap away at any line. Both hold: at the moment the pill came, a
 * button comes in the prayer page's bar, beside search.
 *
 * What would go wrong if this broke: a pill over the prayer's words again; a
 * button whose coming pushes search aside or cuts the page's name short; a
 * button that stays on the same side in Arabic; a prayer page whose bar was
 * never handed one, so its chant is at the head of the page and nowhere else;
 * or a page that has left taking the next page's chant away with it.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
/** One rule's body in the stylesheet, by its selector exactly. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}

const WITH = "components/player/PrayWith.tsx";
const IN_BAR = "components/player/ChantInBar.tsx";
const BAR = "components/nav/MobileTopBar.tsx";

describe("the chant at hand", () => {
  const taken: (() => void)[] = [];
  afterEach(() => {
    for (const back of taken.splice(0)) back();
  });
  const offer = (open: () => void = () => {}) => {
    const back = offerChantAtHand({ open });
    taken.push(back);
    return back;
  };

  it("is not offered until a prayer page offers it, and opens nothing until then", () => {
    expect(chantAtHand()).toBe(false);
    expect(() => openChantAtHand()).not.toThrow();
  });

  it("tells the bar when it comes and when it goes, and opens the page's own picker", () => {
    const heard = vi.fn();
    const stop = onChantAtHand(heard);
    const open = vi.fn();
    const back = offer(open);
    expect(chantAtHand()).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);
    openChantAtHand();
    expect(open).toHaveBeenCalledTimes(1);
    back();
    expect(chantAtHand()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(2);
    // Taken back: the button in the bar opens nothing.
    openChantAtHand();
    expect(open).toHaveBeenCalledTimes(1);
    // Taking it back twice says nothing twice.
    back();
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    offer();
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("is not taken away by a page that has left: the page that came keeps its own", () => {
    const first = vi.fn();
    const second = vi.fn();
    const leave = offer(first);
    offer(second);
    // The first page's leaving comes after the second page's offer.
    leave();
    expect(chantAtHand()).toBe(true);
    openChantAtHand();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});

describe("no pill floats over the prayer", () => {
  const prayWith = code(WITH);

  it("draws nothing fixed to the screen from Pray with, where the pill was", () => {
    // The old pill: a fixed row at the foot of the screen, lifted over the tab bar.
    expect(prayWith).not.toMatch(/\bfixed\b/);
    expect(prayWith).not.toContain("now-playing-lift");
    expect(prayWith).not.toContain("pray-chip");
    // And its styles went with it.
    expect(read("app/globals.css")).not.toContain("pray-chip");
  });

  it("offers the chant to the bar at the moment the pill came, and takes it back", () => {
    expect(prayWith).toContain("const atHand = scrolledPast && silent && !asking && !picker;");
    expect(prayWith).toMatch(/useEffect\(\(\) => \{\s*if \(!atHand\) return;\s*return offerChantAtHand\(\{ open: openPicker \}\);\s*\}, \[atHand, openPicker\]\);/);
  });
});

describe("the chant's button in the bar", () => {
  const inBar = code(IN_BAR);
  const css = read("app/globals.css");

  it("is one of the bar's round buttons: 44px, an icon of the house's, the bar's one weight", () => {
    const cls = inBar.match(/className=\{`\$\{TOP_PLATE\} ([^`]*)`\}/);
    expect(cls).not.toBeNull();
    // No size of its own beside the plate's (lib/ui/__tests__/topPlates.test.ts holds the plate at h-11 w-11).
    expect(cls![1]).not.toMatch(/(?:^|\s)(?:min-|max-)?(?:h|w|size)-/);
    expect(TOP_PLATE).toContain("h-11 w-11");
    expect(inBar).toContain('import { Note } from "@/components/ui/icons/Note";');
    expect(inBar).toContain("<Note {...TOP_ICON} />");
    // Named for a reader who cannot see the mark, in the app's own words.
    expect(inBar).toContain('aria-label={t("chant.button")}');
    expect(inBar).toContain('aria-haspopup="dialog"');
    expect(inBar).toContain("openChantAtHand();");
  });

  it("keeps its place whether it shows or not, so its coming moves nothing in the bar", () => {
    // Always drawn: never left out of the bar while it is not offered.
    expect(inBar).not.toMatch(/offered \? \(|offered &&|return null/);
    expect(inBar).toContain('data-on={offered ? "" : undefined}');
    const hidden = rule(css, ".chant-in-bar");
    expect(hidden).toContain("visibility: hidden;");
    // Never taken out of the row, which would give its place to search and the name.
    expect(hidden).not.toMatch(/display:\s*none|position:\s*(absolute|fixed)|width:\s*0/);
    const shown = rule(css, ".chant-in-bar[data-on]");
    expect(shown).toContain("visibility: visible;");
    expect(shown).toContain("opacity: 1;");
  });

  it("comes and goes on the house's curve, and is simply there with motion off", () => {
    const hidden = rule(css, ".chant-in-bar");
    expect(hidden).toContain("opacity var(--duration-base) var(--ease-house)");
    // Visibility waits for the going to end, and does not wait for the coming.
    expect(hidden).toContain("visibility 0s linear var(--duration-base)");
    expect(rule(css, ".chant-in-bar[data-on]")).toContain("transition-delay: 0s;");
    expect(rule(css, ':where([data-motion="reduce"]) .chant-in-bar')).toContain("transition: none;");
  });

  it("stands before search by start and end, so it mirrors in Arabic", () => {
    const bar = code(BAR);
    // First in the row that ends the bar: the row is laid by the page's own direction.
    expect(bar).toMatch(/<div className="flex shrink-0 items-center gap-0\.5">\s*\{beforeSearch\}\s*\{searchPlace \? \(/);
    // Nothing in the button or its styles names a side.
    const sides = /(?:^|[\s"'`:])-?(?:left|right|ml|mr|pl|pr)-(?:\d|\[|px\b|auto\b)/;
    expect(inBar).not.toMatch(sides);
    const styles = rule(css, ".chant-in-bar") + rule(css, ".chant-in-bar[data-on]");
    expect(styles).not.toMatch(/\b(?:left|right|margin-left|margin-right|padding-left|padding-right|translate|transform)\s*:/);
  });
});

describe("every prayer page hands its bar the chant", () => {
  /** Every page.tsx under app/. */
  function pages(dir: string): string[] {
    return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => {
      const rel = `${dir}/${d.name}`;
      if (d.isDirectory()) return pages(rel);
      return d.name === "page.tsx" ? [rel] : [];
    });
  }

  it("wherever the prayer reader is shown, with Pray with at its head", () => {
    // The reader itself, and the two that wrap it (a rule in the reader's language, a reader's own rule).
    const readers = /<(?:PrayerRuleReader|RuleInReadersLanguage|MyRuleReader)\b/;
    const withReader = pages("app").filter((f) => readers.test(code(f)));
    // Six in 2026-11: morning, evening, an hour, an akathist, a part of a reader's own rule, a prayer by its id.
    expect(withReader.length).toBeGreaterThanOrEqual(6);
    for (const f of withReader) {
      const src = code(f);
      const bar = src.match(/<MobileTopBar\b[^\n]*\/>/);
      expect(bar, `${f} mounts no bar`).not.toBeNull();
      expect(bar![0], `${f}: the bar is handed no chant`).toContain("beforeSearch={<ChantInBar />}");
      expect(src).toContain('import { ChantInBar } from "@/components/player/ChantInBar";');
    }
  });
});
