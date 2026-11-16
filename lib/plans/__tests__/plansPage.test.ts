// The reading plans page (1.9, the owner's pick for Practice, "a mix of A and
// B"): Continue first, the other plans as picture tiles. Vitest has no DOM
// here; the walk at phone size checked the screen. This holds what an edit
// could quietly undo.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { lastRead } from "@/components/plans/PlansClient";
import { READING_PLANS, getPlan } from "@/lib/plans/plans";
import { readAloudCover } from "@/lib/readAloud/covers";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const PAGE = read("components/plans/PlansClient.tsx");
const CSS = read("app/globals.css");

describe("the plan to continue", () => {
  it("is the one read most lately, or begun most lately when none of its days is read", () => {
    expect(lastRead(undefined)).toBe("");
    expect(lastRead({ startedOn: "2026-11-01", done: {} })).toBe("2026-11-01");
    expect(lastRead({ startedOn: "2026-11-01", done: { 0: "2026-11-02", 1: "2026-11-05", 2: "2026-11-03" } })).toBe("2026-11-05");
  });

  it("opens its day as Begin does on the plan's own page, or the upgrade sheet without Plus", () => {
    expect(PAGE).toMatch(/if \(locked\) \{\s*upgrade\.open\("plans"\);\s*return;\s*\}\s*startPlan\(plan\.id\);\s*const session = startPlanSession\(plan, day\);/);
  });
});

describe("a plan's tile", () => {
  it("wears its first book's cover, streamed and never carried in the apps, or its season's picture", () => {
    expect(PAGE).toContain(
      "const cover = plan.season ? { src: SEASON_PICTURES[plan.season], fallback: SEASON_PICTURES[plan.season] } : readAloudCover(plan.cover ?? plan.days[0][0].book);",
    );
    expect(PAGE).toContain("<CoverArt");
  });

  it("wears the saint its books are attributed to, never the manuscript (his rule, 2026-11-09)", () => {
    const saint = (id: string) => {
      const plan = getPlan(id)!;
      return readAloudCover(plan.cover ?? plan.days[0][0].book).nameKey;
    };
    expect(saint("psalter")).toBe("readAloud.cover.david");
    expect(saint("proverbs")).toBe("readAloud.cover.solomon");
    expect(saint("john")).toBe("readAloud.cover.john");
    expect(saint("acts")).toBe("readAloud.cover.luke");
    expect(saint("newtestament")).toBe("readAloud.cover.paul");
    // The library has no icon of the four Evangelists together: St John, his word.
    expect(saint("gospels")).toBe("readAloud.cover.john");
    // Every plan that is not a season's has a saint; a season's keeps its feast's picture.
    for (const plan of READING_PLANS.filter((p) => !p.season)) expect(saint(plan.id), plan.id).not.toBeNull();
  });

  it("melts its picture into the tile's ground by a mask, with nothing laid over it", () => {
    expect(PAGE).toContain('className="plan-tile-picture absolute inset-0 h-full w-full"');
    expect(PAGE).not.toMatch(/bg-gradient-to-|from-night/);
    const rule = CSS.slice(CSS.indexOf(".plan-tile-picture {"), CSS.indexOf("}", CSS.indexOf(".plan-tile-picture {")));
    expect(rule).toContain("mask-image: linear-gradient(to bottom,");
    expect(rule).toContain("-webkit-mask-image:");
  });

  it("shows Plus with its mark, never hidden", () => {
    expect(PAGE).toContain('{locked ? <span className={PREMIUM_CHIP}>{t("study.purifyPlus")}</span> : null}');
  });
});

// A plan's own page (1.9, the fifteen screens' round 3; the owner's note 7 of
// build 97 with The four Gospels' page: "we need a better plans design").
describe("a plan's own page", () => {
  const HEAD = read("components/plans/PlanHead.tsx");
  const CARD = read("components/plans/PlanTodayCard.tsx");
  const DAYS = read("components/plans/PlanPath.tsx");
  const SHELL = read("app/(app)/plans/[id]/page.tsx");

  it("is led by the picture its tile wears, under the clear bar, the plan's name over its foot", () => {
    // The tile's own rule, word for word, so the two never part.
    expect(HEAD).toContain(
      "const cover = plan.season ? { src: SEASON_PICTURES[plan.season], fallback: SEASON_PICTURES[plan.season] } : readAloudCover(plan.cover ?? plan.days[0][0].book);",
    );
    expect(HEAD).toContain("useCoversVersion();");
    expect(HEAD).toMatch(/className="plan-head-picture under-topbar relative -mx-5 overflow-hidden/);
    expect(HEAD).toMatch(/<h1 id="plan-title" className="plan-head-title [^"]*font-serif /);
    expect(SHELL).toContain('revealTitleOn="plan-title" overlay />');
    expect(SHELL).toContain("<PlanHead id={id} />");
    // One name on the page: the shell draws none of its own.
    expect(SHELL).not.toMatch(/<h1\b/);
  });

  it("carries the tile's picture in, and back out, with its name pictured apart over it", () => {
    expect(PAGE).toContain('data-plan-tile-picture="" data-carry={cover.src}>');
    expect(PAGE).toContain("<span aria-hidden data-carry={plan.season ? SEASON_PICTURES[plan.season] : SEASON_PICTURES.nativity}");
    expect(HEAD).toContain("data-carry-into={cover.src}");
    expect(CSS).toMatch(/\.plan-head:has\(> \.plan-head-picture\[style\*="view-transition-name"\]\) > \.plan-head-words \{\s*view-transition-name: plan-words;/);
  });

  it("shades the picture with the page's own ground and nothing else: no rays, no stripe, no fixed colour but the old WebView's", () => {
    const rule = CSS.slice(CSS.indexOf(".plan-head-shade {"), CSS.indexOf("}", CSS.indexOf(".plan-head-shade {")));
    expect(rule).toContain("var(--color-night) 100%");
    expect(rule).not.toMatch(/conic|radial|repeating/);
    expect(HEAD).not.toMatch(/border-(s|e|l|r|inline-start)-\d|bg-gradient/);
  });

  it("makes the day one card for reading: its small line, the passage large in the serif, one Begin", () => {
    expect(CARD).toMatch(/<p className="font-sans text-caption font-semibold text-paper\/55">\{t\("plans\.dayOf", \{ day: dayNumber, total \}\)\}<\/p>\s*<h2 id="plan-today" className="[^"]*font-serif text-heading /);
    expect(CARD.match(/bg-paper /g)).toHaveLength(1);
    expect(CARD).toContain('data-plan-begin=""');
  });

  it("keeps every source, folded under the card behind one quiet line, which a number in the intro opens", () => {
    const card = CARD.slice(CARD.indexOf("<section aria-labelledby=\"plan-today\""), CARD.indexOf("</section>"));
    expect(card).not.toContain("<SourceList");
    expect(CARD).toMatch(/aria-expanded=\{sourcesOpen\}[\s\S]{0,400}\{t\("cite\.sources"\)\}/);
    expect(CARD).toMatch(/\{sourcesOpen \? \(\s*<SourceList id="plan-sources-list" labelledBy="plan-sources" idPrefix=\{PLAN_SOURCE\} sources=\{sources\}/);
    expect(CARD).toContain("const [sourcesOpen, setSourcesOpen] = useState(false);");
    expect(CARD).toMatch(/closest\?\.\(`a\[href\^="#\$\{PLAN_SOURCE\}"\]`\)\) flushSync\(\(\) => setSourcesOpen\(true\)\);/);
  });

  it("lets each day say what it holds: its passage as its words, its number the small part, the check once read", () => {
    expect(DAYS).toContain('{t("paths.day", { n: i + 1 })}');
    expect(DAYS).toContain("{dayLabel(plan.days[i], bookName)}");
    expect(DAYS).toMatch(/\{isRead \? <Check size=\{15\} strokeWidth=\{2\.2\} \/> : isToday \? <span className="block h-2 w-2 rounded-full bg-paper" \/> : null\}/);
    expect(DAYS).toContain('import { Check } from "@/components/ui/icons/Check";');
    // No number in a circle, and no filled white disc beside the page's one Begin.
    expect(DAYS).not.toMatch(/tabular-nums">\{i \+ 1\}/);
    expect(DAYS).not.toMatch(/bg-paper text-night/);
    // The window is as it was: two behind, today, four ahead, the rest folded by book.
    expect(DAYS).toContain("const BEHIND = 2;");
    expect(DAYS).toContain("const AHEAD = 4;");
    expect(DAYS).toContain('{t("plans.allDays")}');
  });
});
