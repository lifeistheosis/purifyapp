import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TOP_ICON, TOP_PLATE } from "@/components/nav/topPlate";

/**
 * One size for every round button at the top of a screen (build 89 note 15,
 * his words: "real quick just noticed it's not optimized (size and
 * positioning)"). The reader's ••• was drawn at h-10 beside a way back at
 * h-11, 43px against 47px, because each button drew a size of its own and
 * two pages handed theirs one more.
 *
 * What would go wrong if this broke: a button opposite the way back at a size
 * of its own again, drawn so or handed one by the page that shows it; a mark
 * on one of them at a weight of its own; the plates back against the line
 * along the status bar, or off the page's margin.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** A size of its own: a height, width or size class, Tailwind's or arbitrary. */
const SIZE = /(?:^|[\s"'`:])(?:min-|max-)?(?:h|w|size)-(?:\d|\[|px\b|full\b|auto\b|fit\b|screen\b)/;

/** Every class string built on the plate: what follows `${TOP_PLATE}` to its closing backtick. */
function plateClasses(src: string): string[] {
  return [...src.matchAll(/`[^`]*\$\{TOP_PLATE\}[^`]*`/g)].map((m) => m[0]);
}

/** From an opening brace (or tag) to its balanced end. */
function balanced(src: string, from: number, open = "{", close = "}"): string {
  let depth = 0;
  for (let j = from; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close && --depth === 0) return src.slice(from, j + 1);
  }
  throw new Error(`unbalanced from ${from}`);
}

/** The opening tag of each JSX element named `name`, braces and all. */
function openingTags(src: string, name: string): string[] {
  return [...src.matchAll(new RegExp(`<${name}\\b`, "g"))].map((m) => {
    let depth = 0;
    for (let j = m.index!; j < src.length; j++) {
      const c = src[j];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) return src.slice(m.index!, j + 1);
    }
    throw new Error(`unclosed <${name}`);
  });
}

/** Every .tsx under app/ and components/. */
function sources(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => {
    const rel = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === "__tests__" ? [] : sources(rel);
    return d.name.endsWith(".tsx") ? [rel.split(path.sep).join("/")] : [];
  });
}

/** What may stand opposite the way back: each draws its button from TOP_PLATE. */
const PLATES = ["MobileReaderActions", "MobileWorkActions", "ShareButton", "BookmarkSaintButton", "BookmarkEventButton", "EventBarActions", "CampaignMenuButton"];

/** Each `trailing` a page hands MobileTopBar, a name it holds resolved to what it holds. */
function trailings(): { file: string; expr: string }[] {
  return [...sources("app"), ...sources("components")].flatMap((file) => {
    const src = read(file);
    return openingTags(src, "MobileTopBar").flatMap((tag) => {
      const at = tag.indexOf("trailing={");
      if (at < 0) return [];
      let expr = balanced(tag, at + "trailing=".length).slice(1, -1).trim();
      if (/^\w+$/.test(expr)) {
        const held = src.match(new RegExp(`const ${expr} = ([\\s\\S]*?);\\n`));
        expect(held, `${file}: trailing={${expr}} holds nothing this test can read`).not.toBeNull();
        expr = held![1];
      }
      return [{ file, expr }];
    });
  });
}

describe("the round buttons at the top of a screen", () => {
  it("are the house's 44px target, with their marks at one weight", () => {
    expect(TOP_PLATE.split(/\s+/).filter((c) => SIZE.test(` ${c}`))).toEqual(["h-11", "w-11"]);
    expect(TOP_PLATE).toContain("rounded-pill");
    // The way back's chevron: 20px on its 1.8 line.
    expect(TOP_ICON).toEqual({ size: 20, strokeWidth: 1.8 });
  });

  it("draw the way back from it", () => {
    const bar = read("components/nav/MobileTopBar.tsx");
    const back = bar.match(/const backClass = (`[^`]*`);/);
    expect(back).not.toBeNull();
    expect(back![1].startsWith("`${TOP_PLATE} ")).toBe(true);
    expect(back![1].replace("${TOP_PLATE}", "")).not.toMatch(SIZE);
    // The button and the link alike.
    expect(bar.match(/<ChevronLeft \{\.\.\.TOP_ICON\} className="rtl:-scale-x-100" \/>/g)).toHaveLength(2);
    expect(bar).not.toMatch(/<ChevronLeft size=/);
  });

  it("draw everything opposite it from it too, with no size of its own", () => {
    const files: Record<string, RegExp[]> = {
      "components/bible/MobileReaderActions.tsx": [/<More size=\{TOP_ICON\.size\} \/>/],
      "components/saints/MobileWorkActions.tsx": [/<More size=\{TOP_ICON\.size\} \/>/],
      "components/campaigns/CampaignMenuButton.tsx": [/<More size=\{TOP_ICON\.size\} \/>/],
      "components/saints/BookmarkSaintButton.tsx": [/<Bookmark \{\.\.\.\(variant === "bar" \? TOP_ICON : /],
      "components/history/BookmarkEventButton.tsx": [/<Bookmark \{\.\.\.TOP_ICON\}/],
      "components/ui/ShareButton.tsx": [/<Check \{\.\.\.TOP_ICON\} \/> : <ShareIcon size=\{TOP_ICON\.size\} stroke=\{TOP_ICON\.strokeWidth\} \/>/],
    };
    for (const [file, marks] of Object.entries(files)) {
      const src = read(file);
      const classes = plateClasses(src);
      expect(classes.length, `${file} draws no button from TOP_PLATE`).toBeGreaterThan(0);
      for (const c of classes) expect(c.replace("${TOP_PLATE}", ""), `${file}: ${c}`).not.toMatch(SIZE);
      for (const mark of marks) expect(src, `${file}: its mark is not at TOP_ICON`).toMatch(mark);
    }
  });

  it("stand at the size of the bar's own search and the website's menu beside them", () => {
    const sizes = (cls: string) => cls.split(/\s+/).filter((c) => SIZE.test(` ${c}`));
    const plate = sizes(TOP_PLATE);
    const bar = read("components/nav/MobileTopBar.tsx");
    const search = bar.match(/data-search-place=\{searchPlace\}\s*className="([^"]*)"/);
    expect(search).not.toBeNull();
    expect(sizes(search![1])).toEqual(plate);
    expect(sizes(read("components/search/SearchTrigger.tsx").match(/"(h-11 w-11 [^"]*)"/)![1])).toEqual(plate);
    expect(sizes(read("components/nav/SiteMenuButton.tsx").match(/className="(h-11 w-11 [^"]*)"/)![1])).toEqual(plate);
  });

  it("are handed no size of their own by the page that shows them", () => {
    const found = trailings();
    // Eight pages hand the bar a trailing in 2026-11; far fewer means the scan broke.
    expect(found.length).toBeGreaterThanOrEqual(8);
    const events = read("components/history/EventArticle.tsx");
    const eventBar = events.slice(events.indexOf("export function EventBarActions"));
    const each = [...found, { file: "components/history/EventArticle.tsx (EventBarActions)", expr: balanced(eventBar, eventBar.indexOf("(\n", eventBar.indexOf("return")), "(", ")") }];
    for (const { file, expr } of each) {
      const names = [...expr.matchAll(/<([A-Za-z][\w.]*)/g)].map((m) => m[1]);
      expect(names.length, `${file}: ${expr}`).toBeGreaterThan(0);
      // No button drawn in place, and nothing the plates do not know.
      for (const n of names) expect(PLATES, `${file}: <${n}> stands opposite the way back`).toContain(n);
      for (const tag of openingTags(expr, "ShareButton")) expect(tag, file).toMatch(/\bround\b/);
      for (const tag of openingTags(expr, "BookmarkSaintButton")) expect(tag, file).toContain('variant="bar"');
      for (const c of expr.matchAll(/className="([^"]*)"/g)) expect(c[1], `${file} hands a size`).not.toMatch(SIZE);
    }
  });

  it("stand clear of the line along the status bar, evenly, on the page's own margin", () => {
    const bar = read("components/nav/MobileTopBar.tsx");
    const row = bar.match(/<div data-plates-row data-screen-edge="top" className="([^"]*)">/);
    expect(row).not.toBeNull();
    const cls = row![1].split(/\s+/);
    // The row is the line, then the plates with the same gap above and below.
    expect(cls).toEqual(expect.arrayContaining(["h-[var(--plates-row-h)]", "pt-[2px]", "px-5"]));
    const css = read("app/globals.css");
    const h = css.match(/--plates-row-h: calc\(([\d.]+)rem \+ (\d+)px\);/);
    expect(h).not.toBeNull();
    // 2px: the reading line (ProgressBar height={2}), which the row starts under.
    expect(Number(h![2])).toBe(2);
    expect(read("components/bible/ReadingProgressBar.tsx")).toContain("height={2}");
    // 2.75rem of plate and 0.5rem above and below it: 8.5px on the 17px root, not 1 to 3px.
    expect(Number(h![1]) - 2.75).toBe(1);
    // The page's margin: every page under the plates stands on px-5 too.
    const pages = [...sources("app"), ...sources("components")].flatMap((f) =>
      [...read(f).matchAll(/className="([^"]*\bunder-plates\b[^"]*)"/g)].map((m) => ({ f, cls: m[1] })),
    );
    expect(pages.length).toBeGreaterThanOrEqual(4);
    for (const { f, cls } of pages) expect(cls.split(/\s+/), f).toContain("px-5");
  });
});
