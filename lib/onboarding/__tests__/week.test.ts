import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import lessons from "@/data/prayers/learning/lessons.json";
import { getCouncil } from "@/lib/councils/councils";
import { HISTORY_EVENTS } from "@/lib/history/events";
import { getRuleMeta } from "@/lib/prayers/rules";
import { PATHS } from "@/lib/reading/paths";
import { getSaint } from "@/lib/saints/saints";

import { ROADS, type Lean, type Road } from "../road";
import { INTENTS, LEVELS, dayOneFor, type Intent, type Level } from "../space";
import {
  NEW_WEEK,
  PASSES_THAT_END,
  PROTESTANT_WEEKS,
  ROAD_WEEKS,
  WEEK_LENGTH,
  WEEK_STEPS,
  localDay,
  parseWeek,
  pickStep,
  stepPassed,
  stepTaken,
  stepToday,
  weekFor,
  weekOver,
  type WeekStepKey,
} from "../week";

// The first week (1.9): seven steps for each road, in place of the one Day 1
// card (docs/1.9-build/notes/onboarding-fable.md, 3.4).

const messages = en as Record<string, string>;
const lessonIds = new Set((lessons as { id: string }[]).map((l) => l.id));
const keys = Object.keys(WEEK_STEPS) as WeekStepKey[];
const LEANS: readonly Lean[] = ["bible", "liturgical"];
const everyWeek = (): { name: string; week: readonly WeekStepKey[] }[] => [
  ...(Object.entries(ROAD_WEEKS) as [string, readonly WeekStepKey[]][]).map(([name, week]) => ({ name, week })),
  ...LEANS.map((lean) => ({ name: `protestant, ${lean}`, week: PROTESTANT_WEEKS[lean] })),
];

describe("the steps a week can hold", () => {
  it("each open a page that exists", () => {
    const appPage = (href: string) => fs.existsSync(path.join(process.cwd(), "app/(app)", href, "page.tsx"));
    for (const key of keys) {
      const { href } = WEEK_STEPS[key];
      const lesson = href.match(/^\/prayers\/learning\/(.+)$/);
      const council = href.match(/^\/councils\/(.+)$/);
      const saint = href.match(/^\/saints\/(.+)$/);
      const event = href.match(/^\/history\/(.+)$/);
      const readingPath = href.match(/^\/reading\/paths\/(.+)$/);
      const rule = href.match(/^\/prayers\/(creed|before-sleep|morning)$/);
      if (lesson) expect(lessonIds.has(lesson[1]), `${key}: ${href}`).toBe(true);
      else if (council) expect(getCouncil(council[1]), `${key}: ${href}`).toBeTruthy();
      else if (saint) expect(getSaint(saint[1]), `${key}: ${href}`).toBeTruthy();
      else if (event) expect(HISTORY_EVENTS.some((e) => e.slug === event[1]), `${key}: ${href}`).toBe(true);
      else if (readingPath) expect(PATHS.some((p) => p.id === readingPath[1]), `${key}: ${href}`).toBe(true);
      else if (rule) expect(getRuleMeta(rule[1])?.href, `${key}: ${href}`).toBe(href);
      else if (/^\/bible\/(john|job|psalms)\/1$/.test(href)) {
        // Pages of a book, each written at build from its own data.
      } else expect(appPage(href), `${key}: ${href}`).toBe(true);
    }
  });

  it("are never a reading plan: every plan's Begin is locked, and a first week is free end to end", () => {
    for (const key of keys) expect(WEEK_STEPS[key].href, key).not.toMatch(/^\/plans(\/|$)/);
    expect(keys).not.toContain("gospelsPlan");
  });

  it("never lead a reader to the studies that do not survive the provenance audit", () => {
    // docs/editorial-standards.md, clergy queue item 5.
    for (const key of keys) expect(WEEK_STEPS[key].href, key).not.toMatch(/^\/theology\/.+/);
    // The study library's own door is the practicing reader's alone, by their own pick.
    for (const { name, week } of everyWeek()) expect(week, name).not.toContain("theology");
  });

  it("say only words the app already has: the page's name, and a line where the app says one of that page", () => {
    for (const key of keys) {
      const step = WEEK_STEPS[key];
      expect(messages[step.titleKey], `${key} ${step.titleKey}`).toBeTruthy();
      if (step.bodyKey) expect(messages[step.bodyKey], `${key} ${step.bodyKey}`).toBeTruthy();
    }
  });

  it("name a council, a saint and an event by the page's own name", () => {
    expect(messages["onboard.week.nicaea"]).toBe(getCouncil("first-nicaea")!.byname);
    expect(messages["onboard.week.ephesus"]).toBe(getCouncil("ephesus")!.byname);
    expect(messages["onboard.week.chalcedon"]).toBe(getCouncil("chalcedon")!.byname);
    expect(messages["onboard.week.carthage"]).toBe(getCouncil("carthage-419")!.byname);
    expect(messages["onboard.week.leo"]).toBe(getSaint("leo-the-great")!.name);
    expect(messages["onboard.week.ignatius"]).toBe(getSaint("ignatius-of-antioch")!.name);
    expect(messages["onboard.week.maryOfEgypt"]).toBe(getSaint("mary-of-egypt")!.name);
    const title = (slug: string) => HISTORY_EVENTS.find((e) => e.slug === slug)!.title;
    expect(messages["onboard.week.schism"]).toBe(title("great-schism-1054"));
    expect(messages["onboard.week.afterChalcedon"]).toBe(title("non-chalcedonian-estrangement"));
  });
});

describe("each road's week", () => {
  it("is seven steps, no page twice", () => {
    for (const { name, week } of everyWeek()) {
      expect(week, name).toHaveLength(WEEK_LENGTH);
      const hrefs = week.map((k) => WEEK_STEPS[k].href);
      expect(new Set(hrefs).size, name).toBe(WEEK_LENGTH);
    }
    // Every road has one.
    expect([...Object.keys(ROAD_WEEKS), "protestant"].sort()).toEqual([...ROADS].sort());
  });

  it("ends, outside the practicing, at the same door: a parish, or a first Liturgy", () => {
    for (const { name, week } of everyWeek()) {
      if (name === "practicing") continue;
      expect(["parish", "firstLiturgy"], name).toContain(week[WEEK_LENGTH - 1]);
      // And a first Liturgy is somewhere in every week that ends at a parish, unless the reader already goes.
      if (!["returning", "catechumen"].includes(name)) expect(week, name).toContain("firstLiturgy");
    }
  });

  it("starts each reader where the line under their pill says", () => {
    // "the Church Fathers and the early councils"
    expect(ROAD_WEEKS.catholic.slice(0, 2)).toEqual(["fathersPath", "nicaea"]);
    // "the Scriptures and the early Church"
    expect(PROTESTANT_WEEKS.bible.slice(0, 2)).toEqual(["gospelJohn", "ignatius"]);
    expect(PROTESTANT_WEEKS.liturgical[0]).toBe("gospelJohn");
    // "the Creed and the first councils"
    expect(ROAD_WEEKS.christian.slice(0, 2)).toEqual(["creed", "nicaea"]);
    // "an introduction to Orthodox Christianity"
    expect(ROAD_WEEKS.newcomer[0]).toBe("startHere");
  });
});

describe("one reader's week", () => {
  const week = (road: Road, picks: Intent[] = [], level: Level | null = "inquirer", lean: Lean = "bible") =>
    weekFor({ road, lean, level, picks }).map((s) => s.key);

  it("is the road's own when they picked nothing", () => {
    for (const road of ROADS.filter((r) => r !== "protestant")) expect(week(road), road).toEqual([...ROAD_WEEKS[road as keyof typeof ROAD_WEEKS]]);
    for (const lean of LEANS) expect(week("protestant", [], "inquirer", lean), lean).toEqual([...PROTESTANT_WEEKS[lean]]);
  });

  it("is led by their first pick, as Day 1 always was, and the road follows in its order", () => {
    expect(week("catholic", ["prayer"])).toEqual(["morningRule", "fathersPath", "nicaea", "leo", "jesusPrayer", "schism", "parish"]);
    // A pick the road already holds moves to the front, and nothing comes twice.
    expect(week("catholic", ["quiet"])).toEqual(["jesusPrayer", "fathersPath", "nicaea", "leo", "schism", "firstLiturgy", "parish"]);
  });

  it("gives the second and third picks the fourth and fifth days", () => {
    expect(week("catholic", ["fathers", "prayer", "saints"])).toEqual([
      "fathersPath",
      "nicaea",
      "leo",
      "morningRule",
      "saintsLives",
      "jesusPrayer",
      "parish",
    ]);
  });

  it("is always seven steps, no page twice, the last day the road's own, whatever was picked", () => {
    for (const road of ROADS) {
      for (const level of [...LEVELS, null] as (Level | null)[]) {
        for (const lean of LEANS) {
          for (const a of INTENTS) {
            for (const b of INTENTS) {
              const picks = a === b ? [a] : [a, b, INTENTS[(INTENTS.indexOf(b) + 3) % INTENTS.length]];
              const w = weekFor({ road, lean, level, picks: [...new Set(picks)] });
              const label = `${road} ${level} ${lean} ${picks.join(",")}`;
              expect(w, label).toHaveLength(WEEK_LENGTH);
              expect(new Set(w.map((s) => s.href)).size, label).toBe(WEEK_LENGTH);
              const base = road === "protestant" ? PROTESTANT_WEEKS[lean] : ROAD_WEEKS[road];
              expect(w[WEEK_LENGTH - 1].key, label).toBe(base[WEEK_LENGTH - 1]);
              for (const s of w) expect(s.href, label).not.toMatch(/^\/plans/);
            }
          }
        }
      }
    }
  });
});

describe("the step a pick opens inside a week", () => {
  it("is the Day 1 step it always opened, but for the locked plan and the study library", () => {
    for (const level of [...LEVELS, null] as (Level | null)[]) {
      for (const intent of INTENTS) {
        const key = pickStep(intent, level);
        const was = dayOneFor(level, intent);
        if (intent === "gospels") expect(key).toBe("gospelJohn");
        else if (intent === "beliefs" && level !== "practicing") expect(["creed", "startHere"]).toContain(key);
        else if (intent === "fathers") expect(key).toBe("fathersPath");
        else if (was.href === "/walkthroughs/job") expect(key).toBe("job");
        // On a road with no level kept (they skipped before it), a reader is
        // not yet going: the Liturgy is the guide to a first one.
        else if (intent === "liturgy" && level === null) expect(key).toBe("firstLiturgy");
        else expect(WEEK_STEPS[key].href, `${level} ${intent}`).toBe(was.href);
      }
    }
  });
});

describe("where a reader stands in their week", () => {
  const mon = "2026-11-09";
  const tue = "2026-11-10";

  it("shows one step a day: the next the next day they open Purify, however long that is", () => {
    expect(stepToday(NEW_WEEK, mon)).toBe(0);
    const one = stepTaken(NEW_WEEK, mon);
    expect(one).toEqual({ at: 1, day: mon, passed: 0 });
    // Taken today: nothing more today.
    expect(stepToday(one, mon)).toBeNull();
    expect(stepToday(one, tue)).toBe(1);
    // A fortnight away costs nothing: the second step is still the next one.
    expect(stepToday(one, "2026-11-24")).toBe(1);
  });

  it("ends after the seventh", () => {
    let w = NEW_WEEK;
    for (let d = 1; d <= WEEK_LENGTH; d++) w = stepTaken(w, `2026-11-${String(d).padStart(2, "0")}`);
    expect(w.at).toBe(WEEK_LENGTH);
    expect(weekOver(w)).toBe(true);
    expect(stepToday(w, "2026-12-01")).toBeNull();
  });

  it("passes a closed step over, and ends quietly when two in a row are closed", () => {
    const passed = stepPassed(NEW_WEEK, mon);
    expect(passed).toEqual({ at: 1, day: mon, passed: 1 });
    expect(stepToday(passed, tue)).toBe(1);
    // Opening the next one says the week is wanted after all.
    expect(stepTaken(passed, tue).passed).toBe(0);
    const twice = stepPassed(passed, tue);
    expect(twice.passed).toBe(PASSES_THAT_END);
    expect(weekOver(twice)).toBe(true);
    expect(stepToday(twice, "2026-11-11")).toBeNull();
  });

  it("reads back only a week it wrote", () => {
    expect(parseWeek(null)).toEqual(NEW_WEEK);
    expect(parseWeek("junk")).toEqual(NEW_WEEK);
    expect(parseWeek(JSON.stringify({ at: 99, day: "yesterday", passed: -1 }))).toEqual({ at: WEEK_LENGTH, day: null, passed: 0 });
    expect(parseWeek(JSON.stringify({ at: 2, day: mon, passed: 1 }))).toEqual({ at: 2, day: mon, passed: 1 });
  });

  it("turns over at the reader's own midnight", () => {
    expect(localDay(new Date(2026, 10, 9, 23, 59))).toBe("2026-11-09");
    expect(localDay(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });
});
