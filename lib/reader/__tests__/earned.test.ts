// The earned palettes (1.9, rec 79): Councils for every council's page read to
// its end, Cappadocian for one work by each of the three Cappadocians read to
// its end; until then the palettes show how far the reader is.
//
// What it holds: the rules (lib/reader/earned.ts) on what the device keeps
// (lib/reading/readToEnd.ts), its list of councils equal to the app's, the
// three Fathers as the saints' pages name them, the marks at the foot of a
// council's page and of a work's last chapter, and the words in every
// language.
//
// What a reader would notice if this broke: a palette never earned after
// reading every council, or earned by opening a page without reading it.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { CAPPADOCIANS, COUNCIL_PAGES, earnedPalettes } from "@/lib/reader/earned";
import { READING_THEMES } from "@/lib/reader/readingModes";
import type { Store } from "@/lib/reading/progress";
import { parseReadToEnd, withReadToEnd, type ReadToEnd } from "@/lib/reading/readToEnd";
import { getSaint } from "@/lib/saints/saints";

const none: ReadToEnd = { councils: [], works: [] };
const done = (of: number): Store[string] => ({ n: of, i: of - 1, of, at: 1, done: true });

describe("the rules", () => {
  it("count every council's page in the app, the nineteen", () => {
    expect([...COUNCIL_PAGES]).toEqual(COUNCILS.map((c) => c.slug));
    expect(COUNCIL_PAGES).toHaveLength(19);
  });

  it("name the three Cappadocians by their saints' pages, each with works to read", () => {
    for (const slug of CAPPADOCIANS) {
      const saint = getSaint(slug) as { works?: unknown[] } | null;
      expect(saint, slug).not.toBeNull();
      expect(saint?.works?.length ?? 0, slug).toBeGreaterThan(0);
    }
  });

  it("earn Councils with every council read to its end, and not one fewer", () => {
    const most = { ...none, councils: COUNCIL_PAGES.slice(0, 18) };
    expect(earnedPalettes(most, {}).councils).toEqual({ read: 18, of: 19, earned: false });
    const all = { ...none, councils: [...COUNCIL_PAGES] };
    expect(earnedPalettes(all, {}).councils).toEqual({ read: 19, of: 19, earned: true });
    // A slug the app does not have counts for nothing.
    expect(earnedPalettes({ ...none, councils: ["not-a-council"] }, {}).councils.read).toBe(0);
  });

  it("earn Cappadocian with one work by each of the three read to its end", () => {
    const two = { ...none, works: ["basil-the-great/on-the-holy-spirit", "gregory-theologian/on-pentecost", "basil-the-great/hexaemeron"] };
    expect(earnedPalettes(two, {}).cappadocian).toEqual({ read: 2, of: 3, earned: false });
    const three = { ...two, works: [...two.works, "gregory-of-nyssa/the-great-catechism"] };
    expect(earnedPalettes(three, {}).cappadocian).toEqual({ read: 3, of: 3, earned: true });
    // Another Father's work counts for nothing.
    expect(earnedPalettes({ ...none, works: ["john-chrysostom/on-the-priesthood"] }, {}).cappadocian.read).toBe(0);
  });

  it("count a work finished before 1.9 when the reading room saw its last chapter reached, and only for a work of more than one chapter", () => {
    const progress: Store = {
      "basil-the-great/hexaemeron": done(9),
      "gregory-theologian/on-pentecost": done(1),
      "gregory-of-nyssa/the-great-catechism": { n: 3, i: 2, of: 40, at: 1 },
    };
    expect(earnedPalettes(none, progress).cappadocian.read).toBe(1);
  });
});

describe("what the device keeps", () => {
  it("is read strictly: anything off its shape is nothing", () => {
    expect(parseReadToEnd(null)).toEqual(none);
    expect(parseReadToEnd("not json")).toEqual(none);
    expect(parseReadToEnd(JSON.stringify({ councils: ["ephesus", 3, "<b>", "ephesus"], works: ["basil-the-great/hexaemeron", "../x"] }))).toEqual({
      councils: ["ephesus"],
      works: ["basil-the-great/hexaemeron"],
    });
  });

  it("keeps each thing once", () => {
    const one = withReadToEnd(none, "council", "ephesus");
    expect(withReadToEnd(one, "council", "ephesus")).toBe(one);
    expect(withReadToEnd(one, "work", "gregory-of-nyssa/the-great-catechism").works).toEqual(["gregory-of-nyssa/the-great-catechism"]);
  });
});

describe("the marks and the palettes", () => {
  it("stand at the foot of a council's page and of a work's last chapter", () => {
    const council = fs.readFileSync("app/(app)/councils/[slug]/page.tsx", "utf8");
    const foot = council.slice(council.lastIndexOf("<ReadToEndMark"));
    expect(foot).toMatch(/^<ReadToEndMark kind="council" id=\{c\.slug\} \/>\s*<\/article>/);
    const reader = fs.readFileSync("components/saints/WritingReader.tsx", "utf8");
    expect(reader).toContain('{next ? null : <ReadToEndMark kind="work" id={key} />}');
    expect(reader).toContain("const key = `${saint.slug}/${content.slug}`;");
  });

  it("say Councils as it has looked since 1.8, deep navy, cream and silver, with no gold in any language", () => {
    // Gold left every palette in 1.8 (the owner, 2026-10-28: the accent is a
    // glowing white, never yellow), but Councils' line still said "Deep navy
    // and gold" in all 21 languages until 2026-11-10 (the Themes chat's note,
    // docs/1.9-build/notes/themes-fable.md). Each language's own word for
    // gold, as that line had it:
    const GOLD: Record<string, RegExp> = {
      ar: /ذهب/, bg: /злат/i, de: /gold/i, el: /χρυσ/i, en: /gold/i, es: /\boro\b/i, fil: /ginto/i,
      fr: /\bor\b/i, hu: /arany/i, id: /emas/i, it: /\boro\b/i, ka: /ოქრო/, ne: /सुन/, pl: /złot/i,
      pt: /\bouro\b/i, ro: /\baur/i, ru: /золот/i, sr: /злат/i, tr: /altın/i, uk: /золот/i, ur: /سنہر/,
    };
    const files = fs.readdirSync("lib/i18n/messages").filter((f) => f.endsWith(".json"));
    expect(files.map((f) => f.replace(".json", "")).sort()).toEqual(Object.keys(GOLD).sort());
    for (const f of files) {
      const line = (JSON.parse(fs.readFileSync(`lib/i18n/messages/${f}`, "utf8")) as Record<string, string>)["settings.paletteCouncilsHint"];
      expect(line, f).not.toMatch(GOLD[f.replace(".json", "")]);
    }
    const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8")) as Record<string, string>;
    expect(en["settings.paletteCouncilsHint"]).toBe("Deep navy, cream and silver");
    expect(READING_THEMES.find((t) => t.id === "councils")?.blurb).toBe(en["settings.paletteCouncilsHint"]);
    // What the palette is: navy ground, cream ink, and the house's white and silver where gold was.
    const css = fs.readFileSync("app/globals.css", "utf8");
    const block = /html\[data-reading-mode="councils"\] \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(block).toContain("--color-night: #0a1020;");
    expect(block).toContain("--color-gold: #eaeaec;");
  });

  it("are named in every language, with how they are earned, and Plus said to a reader without it", () => {
    const keys = ["settings.paletteCouncils", "settings.paletteCouncilsHint", "settings.paletteCappadocian", "settings.paletteCappadocianHint", "settings.paletteProgress", "settings.paletteEarnCouncils", "settings.paletteEarnCappadocian", "settings.palettePlusNote", "settings.paletteEarnedRow"];
    const files = fs.readdirSync("lib/i18n/messages").filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(21);
    for (const f of files) {
      const m = JSON.parse(fs.readFileSync(`lib/i18n/messages/${f}`, "utf8")) as Record<string, string>;
      for (const key of keys) {
        expect(m[key]?.trim(), `${f} ${key}`).toBeTruthy();
        expect(m[key], `${f} ${key}`).not.toMatch(/[—–]/);
      }
      for (const key of ["settings.paletteProgress", "settings.paletteEarnCouncils", "settings.paletteEarnCappadocian"]) {
        expect(m[key], `${f} ${key}`).toContain("{count}");
        expect(m[key], `${f} ${key}`).toContain("{total}");
      }
    }
    for (const id of ["councils", "cappadocian"]) {
      expect(READING_THEMES.find((t) => t.id === id)).toMatchObject({ labelKey: expect.any(String), blurbKey: expect.any(String), collection: true });
    }
    for (const file of ["components/reader/ReadingModeChips.tsx", "components/settings/ReadingModePages.tsx"]) {
      const src = fs.readFileSync(file, "utf8");
      expect(src, file).toContain("{locked ? ` ${t(\"settings.palettePlusNote\")}` : null}");
      expect(src, file).toContain("data-palette-goal={mode.id}");
    }
  });
});
