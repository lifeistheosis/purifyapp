// A source-reading guard, in the idiom of lib/saints/__tests__/iconRights.test.ts
// (MAX_UNVERIFIED) and lib/calendar/__tests__/noFrozenDay.test.ts.
//
// WCAG 2.5.5 asks for a 44x44 CSS px touch target. Nothing in CI checks it:
// tests/smoke/_axe.ts runs the WCAG 2.1 AA tag set, and `target-size` is AAA,
// so it is not in the run. The audit counted roughly sixty interactive
// elements under the floor, worst of them the Save control on Today at 61x22,
// whose height came from a 22px icon and no padding at all.
//
// This cannot measure pixels: vitest here is a node environment with no DOM
// and no layout. What it can do is count the class patterns that PROVE a
// too-small box, and hold that count so it only falls. Fixing a control means
// the number drops and the ceiling drops with it in the same commit. Adding
// one means the suite goes red.
//
// Deliberately narrow: it only counts explicit height classes on elements that
// are interactive, because those are unambiguous. It does NOT catch a control
// whose height comes from its content, which is exactly what the Save button
// was, so a falling number here is evidence of progress and never a proof of
// compliance. The real check is a device walk.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];

// Tailwind height classes below 44px (h-11 = 2.75rem = 44px is the floor).
// h-10 = 40, h-9 = 36, h-8 = 32, h-7 = 28, h-6 = 24.
const SMALL_H = /\bh-(?:[1-9]|10)\b(?!\S)/;

// Heights written out (min-h-[42px], h-[2.5rem]), which the scale above
// cannot see: four controls stood at 42px that way until 2026-11-10 (Fable
// Theology's find, the Community composer's two and Search's rows). A rem is
// the app's root, 17px. A max-h is a ceiling, not a height, and is not read.
const WRITTEN_H = /(?<![\w-])(?:min-)?h-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
const ROOT_PX = 17;

/** Whether a written-out height under 44px stands in these classes. */
function writtenSmall(classes: string): boolean {
  for (const m of classes.matchAll(WRITTEN_H)) {
    const px = m[2] === "px" ? Number(m[1]) : Number(m[1]) * ROOT_PX;
    if (px < 44) return true;
  }
  return false;
}

/** Lines that both open an interactive element and set a sub-44px height. */
const INTERACTIVE = /<(?:button|a|Link)\b/;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (["node_modules", ".next", "out", "__tests__"].includes(entry)) continue;
      yield* walk(full);
    } else if (entry.endsWith(".tsx")) {
      yield full;
    }
  }
}

/**
 * The control's own classes: the first className after its tag, unless a
 * child's tag comes first (then it has none here). A string, or a {...}
 * expression read to its closing brace, with the class strings of any
 * same-file constant it names (`const arrow = "h-11 w-11 ..."`), which the
 * window alone could not see.
 */
function ownClasses(window: string, constants: Map<string, string>): string | null {
  const at = window.indexOf("className=");
  if (at < 0 || /<[A-Za-z]/.test(window.slice(1, at))) return null;
  const rest = window.slice(at + "className=".length);
  let own = "";
  if (rest[0] === '"' || rest[0] === "'") {
    const end = rest.indexOf(rest[0], 1);
    own = rest.slice(1, end < 0 ? undefined : end);
  } else if (rest[0] === "{") {
    let depth = 0;
    let quote = "";
    for (let k = 0; k < rest.length; k++) {
      const c = rest[k];
      if (quote) {
        if (c === quote) quote = "";
        continue;
      }
      if (c === '"' || c === "'") quote = c;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        own = rest.slice(1, k);
        break;
      }
    }
    if (!own) own = rest;
  }
  for (const name of own.match(/\b[A-Za-z_]\w*\b/g) ?? []) {
    const value = constants.get(name);
    if (value) own += ` ${value}`;
  }
  return own;
}

/** A height of 44px or more that the control states for itself. */
function statesTall(classes: string): boolean {
  if (/(?<![\w-])(?:min-)?h-(?:1[1-9]|[2-9]\d|\d{3}|full|screen|svh|dvh)\b/.test(classes)) return true;
  if (/(?<![\w-])size-(?:1[1-9]|[2-9]\d|\d{3})\b/.test(classes)) return true;
  for (const m of classes.matchAll(/(?<![\w-])(?:min-)?(?:h|size)-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) {
    if ((m[2] === "px" ? Number(m[1]) : Number(m[1]) * ROOT_PX) >= 44) return true;
  }
  return false;
}

/**
 * Count sub-44px interactive elements. Each control is read by its own
 * classes first (a height it states for itself, small or 44 and over), and
 * by the classes inside it only when it states none, since then a child's
 * height is its height (an icon button is the size of its icon). Read twelve
 * lines from the tag (1.9: eight missed the Ambience row and the reader
 * settings' chips, whose classes sit further down), and a .hit-44 control
 * has a 44px touch box whatever height it paints at.
 */
function countSmallTargets(): { total: number; byFile: Record<string, number>; written: number; writtenByFile: Record<string, number> } {
  const byFile: Record<string, number> = {};
  const writtenByFile: Record<string, number> = {};
  let total = 0;
  let written = 0;
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      const constants = new Map([...src.matchAll(/\bconst\s+([A-Za-z_]\w*)\s*=\s*(["'])([^"'\n]*)\2/g)].map((m) => [m[1], m[3]] as [string, string]));
      let n = 0;
      let w = 0;
      for (let i = 0; i < lines.length; i++) {
        if (!INTERACTIVE.test(lines[i])) continue;
        // The className may sit on the same line or a few lines below.
        const tagAt = lines[i].search(INTERACTIVE);
        const window = [lines[i].slice(tagAt), ...lines.slice(i + 1, i + 12)].join(" ");
        const upToNextTag = window.split(/<(?:button|a|Link)\b/).slice(0, 2).join(" ");
        if (!/className=/.test(upToNextTag)) continue;
        const own = ownClasses(upToNextTag, constants);
        const read = own === null || (!SMALL_H.test(own) && !writtenSmall(own) && !statesTall(own)) ? upToNextTag : own;
        // A control carrying .hit-44 has a 44px touch box regardless of the
        // height it paints at, so it is not a defect even though the small
        // height class is still there.
        if (/\bhit-44\b/.test(read) || (own !== null && /\bhit-44\b/.test(own))) continue;
        if (SMALL_H.test(read)) n++;
        else if (writtenSmall(read)) w++;
      }
      const name = file.slice(ROOT.length + 1).replace(/\\/g, "/");
      if (n > 0) {
        byFile[name] = n;
        total += n;
      }
      if (w > 0) {
        writtenByFile[name] = w;
        written += w;
      }
    }
  }
  return { total, byFile, written, writtenByFile };
}

// The count as measured when this guard was written. IT MAY ONLY FALL.
// Lower it in the same commit that fixes the controls, so the diff shows the
// work. Never raise it.
//
// 49 -> 46 when components/admin/preview/PurifyShopifyAdmin.tsx was deleted in
// v5. That file was 826 lines of dead Polaris mockup behind /admin/preview,
// imported by nothing, and it held three of the offenders. The ceiling was at
// exactly 49 with the tree at 49, so the redesign had no room for a single
// compact control until it went.
//
// 46 -> 40 on 2026-09-28, with the saved, reading and Florilegium redesign:
// its new controls went in at 44px, the Discord first-open card's two buttons
// went from 40 to 44, and the 40px icon tile became a named constant
// (Graphite ICON_TILE_SM) so a tall row that shows one is no longer read as a
// small target.
//
// 40 -> 39 on 2026-10-15 (1.7): the old floating ambience controller went,
// ambience moved into the reader's settings at 44px.
//
// 39 -> 35 on 2026-10-16 (1.7), with the one phone tab bar (MobileHeader):
// the bar's Support lamp and the dead one in MobileTopBar went, Today's old
// bar and its 40px bell went, and You's 36px settings mark left the bar. The
// search, the bell and the Premium pill's box are 44px on every tab.
//
// 35 -> 33 on 2026-10-28 (1.8), with the Bible reader as the owner's pick B
// of round 2, "The page": the reader's bookmark and settings icons left the
// bar for two round buttons with 44px touch boxes, and the chapter's name on
// the pill is h-11, over 44px. The tree stood at 34 before it, one under the
// line.
// 33 -> 29 on 2026-11-08 (1.9, build 88 note 5, found by
// scripts/mock-check.mjs): the shared sheet's close and the phone top bar's
// menu button were h-10 w-10, 42.5px on the app's 17px root, and are h-11
// w-11. The top bar's back button had the same size in a class constant this
// count cannot see, and went to h-11 w-11 with them. The tree stood at 31
// before it.
// 29 -> 28 on 2026-11-10 (1.9, the arbiter's guardrail list from the Themes
// chat's scripts/mock-check.mjs run on John 1): the chapter pill's two arrows
// were h-10 w-10, 42.5px, and are 44 to the touch with .hit-44, as the audio
// dock's arrows already were. The 44 commentary markers on the same page,
// about 14 by 5 drawn, had a 24px touch box in a class constant this count
// cannot see, and are .hit-44 with them (held below).
// 28 -> 26 on 2026-11-10 (1.9): the tree stood at 26, two fixed since
// without the ceiling following.
// 1.9 (2026-11-11, the arbiter's word): the count reads twelve lines from
// the tag, and each control by its own classes first, so a child's height
// counts only where the control states none of its own (an icon button is
// the size of its icon). So taught it saw 30. The same night 23 went to 44,
// their look kept (.hit-44, or the row's own min-h-11 where it was 57px
// already). Left: the Bible's and a Father's work's desktop action circles
// (VerseRow 1303, 1326, 1359, 1380; ParagraphRow 423, 455, 471), 28px and
// 4px apart, so a 44px touch box would reach into the next one: their
// spacing waits on the owner's word; and the admin panel's five (Admin's):
// SupportConsole 496, GrowthPanel 578 and 597, MessagesTab 296,
// TrafficViews 953.
// 12 -> 7 the same night (the arbiter's word): the admin panel's five are 44.
// The support console's Put in tracking is min-h-11, and Put in the order
// beside it too, which sat past the window; the messages' Shop threads
// switch is min-h-11; the multi-buy's Add a step is h-11, and its Remove
// keeps h-10 beside the two pickers it lines up with and carries .hit-44;
// the traffic reader's scrim was never small, a full-screen button read by
// the grab handle under it, and states its height (h-full) now. Left: the
// seven circles above, which are the Updates chat's.
const MAX_SMALL_TARGETS = 7;

// Heights written out (WRITTEN_H above), counted on their own so the ceiling
// above keeps its history and still only falls. The count learned to read
// them on 2026-11-10 (1.9, Fable Theology's find), when it saw 32: the
// Community composer's field and its Share a line, and Search's rows, at
// 42px, went to 44 the same day; the 29 left are the admin panel's 17
// (30 to 42px, a computer's mouse more than a finger), the shop's 7, and
// one each in the reader's settings, the journal's Today, Now Playing,
// Today's masthead and the profile's settings. IT MAY ONLY FALL, as above.
// The admin panel's 17 went to 44 the same evening (the arbiter's word: he
// uses the panel on his phone, and the rail shows on his iPad): the rail's
// rows, the segmented controls, the reader card's actions, the grab handle,
// and the rows that were 44 only under md now at every width. Two of the 17
// were a child's height read as the button's (the handle's 4px bar, a 20px
// code badge): each button is min-h-11 now, and the child keeps its look by
// its style or its line height.
// The last 12, the ones a reader meets, went the same night (the arbiter's
// word): the 40px controls are 44 (the reader's settings rows, the Ambience
// row beside them too, which sat past this count's window; the shop's
// preview banner, its filter options and the seller's next step); the chips
// and the message's heart keep their size and carry .hit-44 (the product's
// chips, the shop's facet chips and their Clear all, whose wrapped rows now
// stand 10px apart so the touch boxes do not overlap; the profile's
// toggles; the masthead's fasting link, a line of text); and two were a
// child's height read as the control's (Today's icon tile in a 54px row,
// Now Playing's loop number in a 44px option), which keep their look by
// size-[38px] and by style. None is left.
// The count taught on 2026-11-11 (above) sees two more that the eight-line
// window could not: the admin panel's traffic rows (TrafficViews 283 and
// 772, min-h-[27px] and min-h-[28px]). Not new controls, newly seen, as the
// 32 were when the count first read written heights; they are Admin's, and
// this falls to 0 with them.
// 2 -> 0 the same night: the country rows beside the map are min-h-11 to a
// finger (46.75px measured), and under a mouse (pointer-fine) stand at 28px
// by padding, where they were drawn at 27, above WCAG's 24px floor for a
// pointer; the table's country name keeps its 28px and carries .hit-44,
// whose 44px box fits inside its 45px row. None is left.
const MAX_WRITTEN_SMALL_TARGETS = 0;

describe("touch targets", () => {
  const { total, byFile, written, writtenByFile } = countSmallTargets();

  it(`has no more than ${MAX_WRITTEN_SMALL_TARGETS} interactive elements with a written-out height under 44px`, () => {
    const worst = Object.entries(writtenByFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([f, n]) => `  ${n}  ${f}`)
      .join("\n");
    expect(
      written,
      `Interactive elements with a written-out height under 44px (min-h-[42px] and the like) rose to ${written}, ceiling ${MAX_WRITTEN_SMALL_TARGETS}.\n` +
        `Write 44 (min-h-[44px], or min-h-11) or give the control .hit-44, then lower the ceiling. Worst offenders:\n${worst}`,
    ).toBeLessThanOrEqual(MAX_WRITTEN_SMALL_TARGETS);
  });

  it("keeps the reader settings' chips 44 to the touch on a computer too", () => {
    // The text size, font, spacing and palette chips draw at 36 to 38px where
    // the pointer is fine (a touch laptop or a tablet's browser at desktop
    // width meets them with a finger). The count above cannot see them: the
    // size chips' min-h-9 sits past its eight-line window and the palettes
    // take their height from padding. So they are named here (the arbiter's
    // word, 2026-11-10): each carries .hit-44 there, and the palettes' rows
    // stand 8.5px apart so two touch boxes never overlap.
    const menu = readFileSync(join(ROOT, "components/bible/ReaderSettingsMenu.tsx"), "utf8");
    const chips = readFileSync(join(ROOT, "components/reader/ReadingModeChips.tsx"), "utf8");
    expect(menu).toContain('touch ? "min-h-11 text-detail" : "hit-44 min-h-9 text-caption"');
    expect(chips.split('touch ? "min-h-11 text-detail" : "hit-44 text-caption"').length - 1).toBe(2);
    expect(chips).toContain('touch ? "gap-y-1.5" : "gap-y-2"');
  });

  it("reads a control by its own classes, and a child's height only where the control states none", () => {
    const none = new Map<string, string>();
    // Its own classes, not a child's.
    expect(ownClasses('<button type="button" className="min-h-11 px-2"><span className="h-3 w-3" />', none)).toBe("min-h-11 px-2");
    expect(ownClasses('<button className={cn("h-9 w-9", on && "x")}>', none)).toContain("h-9 w-9");
    // A child's class before any of its own: none here.
    expect(ownClasses('<button type="button"><span className="h-6" />', none)).toBeNull();
    // A same-file constant is read through (MobileWorkPill's arrows).
    expect(ownClasses("<button className={cn(arrow, next ? \"a\" : \"b\")}>", new Map([["arrow", "h-11 w-11"]]))).toContain("h-11 w-11");
    // 44 and over, stated: a child's height is then the child's.
    for (const tall of ["min-h-11", "h-12", "size-11", "h-[50px]", "min-h-[104px]", "h-full"]) expect(statesTall(tall), tall).toBe(true);
    for (const small of ["h-9", "min-h-9", "h-[40px]", "size-10", "px-4"]) expect(statesTall(small), small).toBe(false);
  });

  it("reads a height written out as well as the scale's", () => {
    expect(writtenSmall('className="min-h-[42px] px-3"')).toBe(true);
    expect(writtenSmall('className="h-[2.5rem]"')).toBe(true);
    expect(writtenSmall('className="min-h-[44px]"')).toBe(false);
    expect(writtenSmall('className="max-h-[30px]"')).toBe(false);
    // The three found on 2026-11-10 are 44 now.
    const composer = readFileSync(join(ROOT, "components/community/CommunityClient.tsx"), "utf8");
    expect((composer.match(/min-h-\[44px\]/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(composer).not.toContain("min-h-[42px]");
    expect(readFileSync(join(ROOT, "components/search/SearchRows.tsx"), "utf8")).toContain('className="search-row flex min-h-[44px] ');
  });

  it(`has no more than ${MAX_SMALL_TARGETS} interactive elements under 44px`, () => {
    const worst = Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([f, n]) => `  ${n}  ${f}`)
      .join("\n");
    expect(
      total,
      `Sub-44px interactive elements rose to ${total}, ceiling ${MAX_SMALL_TARGETS}.\n` +
        `WCAG 2.5.5 wants 44x44. Give the control real padding where the layout\n` +
        `has room, or app/globals.css .hit-44 where it does not, then lower the\n` +
        `ceiling in this file. Worst offenders:\n${worst}`,
    ).toBeLessThanOrEqual(MAX_SMALL_TARGETS);
  });

  it("the Bible's commentary markers and the chapter pill's arrows are 44px to the touch", () => {
    const verse = readFileSync(join(ROOT, "components/bible/VerseRow.tsx"), "utf8");
    // Beside the marker, never over a word: before a verse, and after a drop-capped first verse.
    expect(verse).toContain('const TAP_TARGET = "touch-manipulation hit-44 hit-44-lead";');
    expect(verse).toContain('const TAP_TARGET_AFTER = "touch-manipulation hit-44 hit-44-trail";');
    expect((verse.match(/^\s*TAP_TARGET,$/gm) ?? []).length).toBe(1);
    expect((verse.match(/^\s*TAP_TARGET_AFTER,$/gm) ?? []).length).toBe(1);
    // The squares' gap is the markers' own (0.375rem, spacing 1.5), and it is logical.
    expect(verse).toContain('<span className="inline-flex items-baseline me-1.5 align-super">');
    expect(verse).toContain('<span className="inline-flex items-baseline ms-1.5 align-super">');
    const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
    expect(css).toMatch(/\.hit-44\.hit-44-lead::after \{\s*inset-inline-end: -0\.375rem;\s*\}/);
    expect(css).toMatch(/\.hit-44\.hit-44-trail::after \{\s*inset-inline-start: -0\.375rem;\s*\}/);
    const pill = readFileSync(join(ROOT, "components/bible/MobileChapterPill.tsx"), "utf8");
    const link = pill.slice(pill.indexOf("<Link"), pill.indexOf(">", pill.indexOf("className=", pill.indexOf("<Link"))));
    expect(link).toMatch(/className="hit-44 h-10 w-10 /);
  });

  it("the small text links the same checkMock run found are 44px to the touch", () => {
    // John 1's links to the neighbouring books (41 by 19) and Today's "See all" (51 by 19).
    const pager = readFileSync(join(ROOT, "components/bible/ChapterPager.tsx"), "utf8");
    expect((pager.match(/className="hit-44 hover:text-paper transition-colors"/g) ?? []).length).toBe(2);
    const pray = readFileSync(join(ROOT, "components/today/PrayNowCard.tsx"), "utf8");
    expect(pray).toContain('className="hit-44 tap-press inline-flex items-center gap-0.5');
  });

  it("Theology's councils heading, a 22px line of words, is 44px to the touch", () => {
    const lib = readFileSync(join(ROOT, "components/theology/TheologyLibrary.tsx"), "utf8");
    expect(lib).toContain('<Link href="/councils" className="hit-44 tap-press flex items-baseline justify-between gap-3">');
  });

  it("the .hit-44 utility the fixes rely on is still defined", () => {
    const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
    expect(css).toMatch(/\.hit-44::after\s*\{/);
    expect(css).toMatch(/min-height:\s*44px/);
  });
});
