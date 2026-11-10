// The pages behind Theology's four buttons (1.9, build 89 note 2): Doctrine,
// Topics, Heresies and Apologetics, revamped in the house style on the
// owner's word of 2026-11-10 ("it still looks like the old version, and it
// still looks AI like vibe coded slop ... revamp it using our style"). The
// plan is docs/1.9-build/notes/theology-fable.md.
//
// What a reader would notice if this broke: two bars stacked, or none; the
// row of four pills or the floating search pill back on these pages; a
// number in a page's head that is not the number on its button; a study the
// library has that Doctrine does not list; a grey line that cannot be read
// on Light; a line down the side of a card. Read as text, as the other
// Theology suites are: the built pages are measured by scripts/mock-check.mjs.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { APOLOGETICS_TOPICS } from "@/lib/apologetics/topics";
import { HERESIES } from "@/lib/heresies/heresies";
import { shouldShowBack } from "@/lib/nav/backBar";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";
import { THEOLOGY_TOPICS } from "@/lib/theology/topics";
import { wayCounts } from "@/lib/theology/wayCounts";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (file: string) =>
  read(file)
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const MESSAGES = path.join(ROOT, "lib/i18n/messages");
const catalogs = fs
  .readdirSync(MESSAGES)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ lang: f.replace(/\.json$/, ""), messages: JSON.parse(read(`lib/i18n/messages/${f}`)) as Record<string, string> }));

const FRAME = "components/theology/WayPage.tsx";
const STYLE = "components/theology/wayStyle.ts";
const SHELVES = "components/theology/StudyShelves.tsx";
const HUB_PAGE = "app/(app)/theology/page.tsx";
const WAYS = [
  { way: "doctrine", route: "/theology/doctrine", page: "app/(app)/theology/doctrine/page.tsx", name: "study.doctrine", lead: "study.theology.doctrineLead" },
  { way: "topics", route: "/topics", page: "app/(app)/topics/page.tsx", name: "discover.tile.topics", lead: "topics.h1" },
  { way: "heresies", route: "/heresies", page: "app/(app)/heresies/page.tsx", name: "discover.tile.heresies", lead: "study.heresies.lead" },
  { way: "apologetics", route: "/apologetics", page: "app/(app)/apologetics/page.tsx", name: "discover.tile.apologetics", lead: "study.apologetics.lead" },
] as const;
/** Everything this round wrote for the four pages. */
const OWN = [FRAME, STYLE, SHELVES, ...WAYS.map((w) => w.page)];

describe("each of the four ways' own pages", () => {
  it("wears one bar: the way's name, back to Theology, the search turned to Theology", () => {
    for (const w of WAYS) {
      expect(code(w.page), w.page).toContain(
        `<MobileTopBar titleKey="${w.name}" back backFallback="/theology" revealTitleOn={WAY_TITLE} searchPlace="theology" />`,
      );
      // The apps' back bar steps aside for it, so there is one bar and not two.
      expect(shouldShowBack(w.route), w.route).toBe(false);
    }
    // The bar takes the name once the page's own heading has gone up under it.
    expect(code(STYLE)).toContain('export const WAY_TITLE = "way-title";');
    expect(code(FRAME)).toContain("<h1 id={WAY_TITLE} ");
    // What the four list keeps the back bar: a topic, a heresy, an answer.
    for (const route of ["/topics/theosis", "/heresies/arianism", "/apologetics/atheism"]) expect(shouldShowBack(route), route).toBe(true);
  });

  it("left the old shell: no label over a row of pills, and no floating search pill", () => {
    for (const file of OWN) {
      for (const gone of ["TheologyShell", "TheologyNav", "TheologySearch", "rounded-full px-4"]) expect(code(file), `${file}: ${gone}`).not.toContain(gone);
    }
  });

  it("is headed by its button, grown: the hub's own glyph, name, kind and count, then its one line", () => {
    const frame = code(FRAME);
    // The hub's own list of the four, not a second one.
    expect(frame).toContain('import { WAYS, type WayCounts } from "./TheologyLibrary";');
    for (const part of ['className="theology-glyph ', "<own.Icon size={32} />", "<T k={own.label} />", "<T k={own.kicker} />", "{counts[way]}", "<T k={lead} />"]) {
      expect(frame, part).toContain(part);
    }
    // Each part of the head is one element with a name, for the move note 4 plans.
    for (const hook of ["data-way-head", "data-way-glyph", "data-way-name", "data-way-kind"]) expect(frame, hook).toContain(hook);
    for (const w of WAYS) {
      expect(code(w.page), w.page).toMatch(new RegExp(`<WayPage\\s+way="${w.way}"\\s+counts=\\{counts\\}\\s+lead="${w.lead.replace(/\./g, "\\.")}"`));
    }
  });

  it("closes with what it keeps to, then the other three ways as rows in one tray", () => {
    const frame = code(FRAME);
    expect(frame.indexOf("{children}")).toBeLessThan(frame.indexOf("data-way-note"));
    expect(frame.indexOf("data-way-note")).toBeLessThan(frame.indexOf("data-way-rest"));
    expect(frame).toContain("WAYS.filter((w) => w.key !== way)");
    expect(frame).toContain('className="theology-row flex min-h-[54px] ');
    // The paragraph that stood under the old headline is the note, the same words.
    const notes = { doctrine: "study.eachStudyLaysOutThe", topics: "topics.intro", heresies: "study.everyEcumenicalCouncilIsDefined", apologetics: "study.whereDoctrineAndTopicsArgue" };
    for (const w of WAYS) expect(code(w.page), w.page).toContain(`<T k="${notes[w.way]}" />`);
  });
});

describe("the numbers in the heads", () => {
  it("are the registries' own, and counted as the hub counts them for its buttons", async () => {
    const counts = await wayCounts();
    const topicFiles = fs.readdirSync(path.join(ROOT, "data/topics")).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
    expect(counts).toEqual({
      doctrine: THEOLOGY_TOPICS.filter((t) => !t.planned).length,
      topics: topicFiles.length,
      heresies: HERESIES.length,
      apologetics: APOLOGETICS_TOPICS.filter((t) => !t.planned).length,
    });
    // The hub's own counting. If it changes, lib/theology/wayCounts.ts changes with it.
    const hub = code(HUB_PAGE);
    for (const line of [
      "THEOLOGY_TOPICS.filter((t) => !t.planned)",
      "doctrine: doctrine.length,",
      "topics: topics.length,",
      "heresies: HERESIES.length,",
      "apologetics: APOLOGETICS_TOPICS.filter((t) => !t.planned).length,",
    ]) {
      expect(hub, line).toContain(line);
    }
  });
});

describe("Doctrine, the treatises by subject", () => {
  it("lists every study the library has: each stands under one subject of the path", () => {
    for (const study of THEOLOGY_TOPICS.filter((t) => !t.planned)) {
      const under = THEOLOGY_SUBJECTS.filter((s) => s.studies.includes(study.slug)).map((s) => s.id);
      expect(under, `${study.slug} is under ${under.join(", ") || "no subject"}: Doctrine's page lists a study once, under its subject`).toHaveLength(1);
    }
  });

  it("draws the path's own studies as shelves, each under its subject's icon whole on a plate", () => {
    const page = code(WAYS[0].page);
    expect(page).toContain("pathSteps(IS_STATIC_EXPORT)");
    expect(page).toContain('studies: step.reads.filter((read) => read.kind === "study"),');
    expect(page).toContain(".filter((shelf) => shelf.studies.length > 0);");
    const shelves = code(SHELVES);
    expect(shelves).toMatch(/className="path-plate w-\[56px\] shrink-0">\s*<WholeIcon src=\{shelf\.picture\}/);
    // The shelf's head opens its step of the path.
    expect(shelves).toContain("href={`/theology/path/${shelf.id}`}");
  });

  it("gives each study the face of the Father it quotes most, and its length, its part or its check", () => {
    const shelves = code(SHELVES);
    expect(shelves).toContain("<FatherFace father={study.father} size={38} />");
    expect(shelves).toContain("<ReadMeta read={study} progress={progress} />");
    expect(shelves).toContain("const read = progress.read.includes(study.id);");
    expect(shelves).toContain('<span className="sr-only">{t("paths.read")}</span>');
    // The reader's place is read on the device, never written from this page.
    expect(shelves).toContain("const progress = usePathProgress();");
    expect(shelves).not.toContain("updatePathProgress");
  });
});

describe("Topics, the questions answered", () => {
  it("is a card for each question in the order of the Creed, with its short answer as the path gives it", () => {
    const page = code(WAYS[1].page);
    expect(page).toContain("short: firstSentence(topic.definition),");
    expect(page).toContain(".sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));");
    expect(page).toMatch(/className="path-plate w-\[78px\] shrink-0">\s*<WholeIcon src=\{card\.picture\}/);
    expect(page).toContain('<T k="topics.citations" count={card.citations} />');
    // The catalog's words, in every language: no German written into the page.
    expect(page).not.toContain("getServerLocale");
    expect(page).not.toMatch(/isDe\b/);
  });

  it("has an icon for every question the library holds today", () => {
    const named = new Set(THEOLOGY_SUBJECTS.flatMap((s) => s.topics));
    for (const file of fs.readdirSync(path.join(ROOT, "data/topics")).filter((f) => f.endsWith(".json") && !f.startsWith("_"))) {
      expect(named.has(file.replace(/\.json$/, "")), file).toBe(true);
    }
  });
});

describe("Heresies, the record by century", () => {
  it("keeps the registry's order: a century's errors stand together", () => {
    const seen: string[] = [];
    for (const h of HERESIES) {
      if (seen[seen.length - 1] === h.era) continue;
      expect(seen, `${h.era} comes back after another century, so its tray would be drawn twice`).not.toContain(h.era);
      seen.push(h.era);
    }
    expect(seen.length).toBeGreaterThan(3);
  });

  it("draws each error as a row: the scroll on its plate, its name and the registry's one line", () => {
    const page = code(WAYS[2].page);
    for (const part of ["<Scroll size={17} />", "{h.name}", "{h.shortBio}", "href={`/heresies/${h.slug}`}", 'href="/councils"']) expect(page, part).toContain(part);
    for (const h of HERESIES) expect(h.shortBio.length, h.slug).toBeGreaterThan(20);
  });
});

describe("Apologetics, the answers", () => {
  it("draws each answer as a card with its summary whole, and leaves out what is only planned", () => {
    const page = code(WAYS[3].page);
    for (const part of ["<Shield size={17} />", "{answer.title}", "{answer.subtitle}", "{answer.summary}", "apologeticsByGroup(group).filter((answer) => !answer.planned)"]) {
      expect(page, part).toContain(part);
    }
  });
});

describe("the four pages' look", () => {
  it("cuts no line short with dots: a reader sees every word or none of it", () => {
    // The two rows of the foot's tray truncate a name and a kind, as the hub's rows do.
    for (const file of OWN) expect(code(file), file).not.toMatch(/line-clamp-/);
    for (const file of [SHELVES, ...WAYS.map((w) => w.page)]) expect(code(file), file).not.toMatch(/\btruncate\b/);
  });

  it("draws no side stripe: no border on one side of a card, a row or a line", () => {
    for (const file of OWN) expect(code(file), file).not.toMatch(/\bborder-(?:s|e|l|r|x)(?:-|\b)/);
  });

  it("keeps its grey lines to the shares every palette lifts to 4.5:1 (lib/ui/__tests__/faintText.test.ts)", () => {
    // Under 70 percent the ink is readable on Light only at 45, 50, 55 or 60,
    // which app/globals.css redraws at 70 there.
    const lifted = new Set([45, 50, 55, 60]);
    for (const file of OWN) {
      for (const [, share] of code(file).matchAll(/(?<![\w:-])text-paper\/(\d+)/g)) {
        const n = Number(share);
        expect(n >= 70 || lifted.has(n), `${file}: text-paper/${share}`).toBe(true);
      }
    }
  });

  it("gives every row and card a target 44px tall or more", () => {
    expect(code(SHELVES)).toContain('className="theology-row flex min-h-[56px] ');
    expect(code(WAYS[2].page)).toContain('className="theology-row flex min-h-[56px] ');
    // A card is its picture or its words, each taller than 44px; the note's link is in a sentence.
    expect(code(WAYS[2].page)).toContain('className="underline decoration-paper/30 underline-offset-4 hover:text-paper"');
  });

  it("arrives in reading order after the route's fade, and stays still with Purify's motion off", () => {
    expect(code(FRAME)).toContain('className="cascade cascade-tight mx-auto w-full max-w-[640px]"');
    expect(css).toContain(':where([data-motion="reduce"]) .cascade > * {');
  });
});

describe("the four pages' words", () => {
  it("are the catalog's own, in all 21 languages: nothing new was written", () => {
    expect(catalogs).toHaveLength(21);
    const used = OWN.map(code).join("\n");
    const keys = new Set<string>([
      ...[...used.matchAll(/<T k="([a-zA-Z0-9_.]+)"/g)].map((m) => m[1]),
      ...[...used.matchAll(/\bt\("([a-zA-Z0-9_.]+)"/g)].map((m) => m[1]),
      ...WAYS.flatMap((w) => [w.name, w.lead]),
      "study.theology.kicker.doctrine",
      "study.theology.kicker.topics",
      "study.theology.kicker.heresies",
      "study.theology.kicker.apologetics",
    ]);
    expect(keys.size).toBeGreaterThan(12);
    for (const key of keys) {
      for (const { lang, messages } of catalogs) {
        const known = messages[key] !== undefined || messages[`${key}.one`] !== undefined || messages[`${key}.singular`] !== undefined;
        expect(known, `${lang}: ${key}`).toBe(true);
      }
    }
  });

  it("carry no em dash", () => {
    for (const file of [...OWN, "lib/theology/wayCounts.ts", "docs/1.9-build/notes/theology-fable.md"]) {
      expect(read(file).includes(String.fromCharCode(0x2014)), file).toBe(false);
    }
  });
});
