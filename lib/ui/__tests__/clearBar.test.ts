// The way back on a picture (build 90 note 3; docs/1.9-build/notes/build-90.md).
//
// His screenshot of the Second Council of Nicaea: the way back's chevron stood
// on the small heading "Seventh Ecumenical Council", with only a faint disc
// under it. A page whose bar starts clear over its picture (MobileTopBar
// `overlay`) turned solid only once the page's NAME had gone under it, so the
// words above the name (a council's ordinal line, a doctrine's quoted line)
// and then the name passed under the clear bar and its plates first. Measured
// on the export: every council from 105px of scroll, Your rule from 95px, a
// Theology topic from 185px, a Theology path from 355px, a saint from 265px.
//
// Now the bar turns solid as soon as the head's FIRST words reach it
// (`solidFrom`, the name when a page gives none), its name still arrives with
// the page's (two marks: data-solid, data-revealed), and each plate has a fine
// edge of paper so it reads over a dark icon. This holds:
//
//   1. every page that starts its bar clear names its first words, or its
//      name is its first words, with the reason here;
//   2. each named place is drawn with that id;
//   3. the bar keeps the two marks, and the clear look is keyed on the first;
//   4. a clear plate has its 13% edge.
//
// The walk on the export is scripts/clear-bar-walk.mjs: it scrolls every such
// page 5px at a time and fails on any word under a button while the bar is
// clear.
//
// What would go wrong if this broke: the way back standing on a page's words
// again, or a new clear-bar page joining with the old rule.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...filesUnder(rel));
    } else if (/\.tsx$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/** Every `<MobileTopBar ... />` that starts clear over a picture, by file. */
function clearBars(): Array<{ file: string; tag: string }> {
  const found: Array<{ file: string; tag: string }> = [];
  for (const file of [...filesUnder("app"), ...filesUnder("components")]) {
    if (file.endsWith(path.join("nav", "MobileTopBar.tsx"))) continue;
    const src = read(file);
    for (const m of src.matchAll(/<MobileTopBar\b[\s\S]*?\/>/g)) {
      if (/\boverlay\b/.test(m[0])) found.push({ file, tag: m[0] });
    }
  }
  return found;
}

/** Pages whose name is the first of the head's words, so the bar reads the name itself. */
const NAME_FIRST: Record<string, string> = {
  "app/(app)/saints/[slug]/page.tsx": "the saint's name opens the head (components/saints/SaintHero.tsx)",
  "app/(app)/chants/[slug]/page.tsx": "the chant's name opens the words on its cover (components/chants/ChantPage.tsx)",
  "app/(app)/prayers/personal/page.tsx": "Your rule's heading is the head's first line (components/prayers/mine/RuleHead.tsx)",
  "app/(app)/campaigns/detail/page.tsx": "the campaign's title opens the head (components/campaigns/CampaignPage.tsx)",
};

/** Where each named first words are drawn, and how the test finds the id there. */
const FIRST_WORDS: Record<string, { file: string; drawn: RegExp }> = {
  "app/(app)/councils/[slug]/page.tsx": { file: "app/(app)/councils/[slug]/page.tsx", drawn: /<p id="council-ordinal"[^>]*>\s*<T k=\{ordinalKey\(c\)\} \/>/ },
  "app/(app)/theology/path/[subject]/page.tsx": { file: "app/(app)/theology/path/[subject]/page.tsx", drawn: /<p\s+id="step-kicker"[\s\S]*?\{stepNumeral\(step\.n\)\}/ },
  "app/(app)/theology/[topic]/page.tsx": { file: "components/theology/TopicReader.tsx", drawn: /firstId=\{epigraph \? DOCTRINE_FIRST_WORDS : undefined\}[\s\S]*?id=\{epigraph \? undefined : DOCTRINE_FIRST_WORDS\}/ },
  // The gift's caption under the cards comes before its ticket's eyebrow and name.
  "app/(app)/gift/page.tsx": { file: "components/gifts/OrderGiftClient.tsx", drawn: /<p id="gift-caption" className="gift-caption">\{t\("orderGift\.caption"\)\}<\/p>/ },
};

describe("a bar that starts clear over a picture turns solid at the head's first words", () => {
  it("finds the clear-bar pages", () => {
    // Seven today: a saint, a council, a doctrine, a path, Your rule, a chant, a campaign.
    expect(clearBars().length).toBeGreaterThanOrEqual(7);
  });

  it("every one names its first words, or its name is its first words, with the reason here", () => {
    const unnamed = clearBars()
      .filter(({ file, tag }) => !/\bsolidFrom=/.test(tag) && !(file in NAME_FIRST))
      .map(({ file }) => file);
    expect(unnamed, "Give the MobileTopBar solidFrom=<id of the head's first words>, or add the page to NAME_FIRST with why its name comes first").toEqual([]);
  });

  it("each named place is drawn with its id", () => {
    const named = clearBars().filter(({ tag }) => /\bsolidFrom=/.test(tag));
    expect(named.map(({ file }) => file).sort()).toEqual(Object.keys(FIRST_WORDS).sort());
    for (const { file } of named) {
      const where = FIRST_WORDS[file];
      expect(read(where.file), `${file}: its first words in ${where.file}`).toMatch(where.drawn);
    }
    // The doctrine's epigraph takes the id on the figure that holds it.
    expect(read("components/theology/StudyCover.tsx")).toMatch(/<figure ref=\{words\} id=\{firstId\} data-study-epigraph=""/);
  });

  it("a page named here still draws a clear bar", () => {
    const files = new Set(clearBars().map(({ file }) => file));
    for (const file of Object.keys(NAME_FIRST)) expect(files.has(file), `${file} is listed but draws no clear bar`).toBe(true);
  });

  it("the bar keeps two marks: solid at the first words, its name when the page's has gone", () => {
    const bar = read("components/nav/MobileTopBar.tsx");
    expect(bar).toMatch(/solidFrom\?: string;/);
    expect(bar).toContain('mark("data-solid", gone || reached);');
    expect(bar).toContain('mark("data-revealed", gone);');
    // The first words count as reached when any of them is under the bar's foot.
    expect(bar).toContain("reached = entry.boundingClientRect.top < top;");
    // Asked again as the line goes on under the bar, not only at its two edges.
    expect(bar).toContain("threshold: [0, 0.25, 0.5, 0.75, 1]");
  });

  it("the clear look is keyed on the first mark, and the bar's name on the second", () => {
    const css = read("app/globals.css");
    expect(css).toContain("[data-mobile-topbar][data-overlay]:not([data-solid]) {");
    expect(css).toContain("[data-mobile-topbar][data-overlay]:not([data-solid]) :is(a, button) {");
    expect(css).not.toMatch(/\[data-overlay\]:not\(\[data-revealed\]\)/);
    expect(css).toContain("[data-mobile-topbar][data-revealed] [data-topbar-title][data-reveal] {");
  });

  it("a clear plate has a fine edge of paper at 13%, as the new post page's Close", () => {
    const css = read("app/globals.css");
    const rule = css.slice(css.indexOf("[data-mobile-topbar][data-overlay]:not([data-solid]) :is(a, button) {"));
    const body = rule.slice(0, rule.indexOf("}"));
    expect(body).toContain("border-color: rgb(255 255 255 / 0.13);");
    expect(body).toContain("border-color: color-mix(in srgb, var(--color-paper) 13%, transparent);");
    // Its edge is there on the solid bar too, unseen, so it fades with the ground.
    expect(css).toMatch(/\[data-mobile-topbar\]\[data-overlay\] :is\(a, button\) \{\s*border: 1px solid transparent;/);
    expect(read("components/community/ComposePage.tsx")).toContain("border border-paper/[0.13]");
  });
});
