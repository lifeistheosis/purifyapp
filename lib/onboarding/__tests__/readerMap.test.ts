import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";

import { flowSteps } from "../flowSteps";
import { INTRO_FEATURE } from "../plusIntro";
import { readerTypeOf } from "../readerType";
import { ROADS, leanOf, roadOf, type Lean, type Road } from "../road";
import { ALL_BACKGROUNDS, INTENTS, LEVELS, asksRule, defaultsFor, type Background, type Intent, type Level } from "../space";
import { PROTESTANT_WEEKS, ROAD_WEEKS, WEEK_LENGTH, WEEK_STEPS, pickStep, weekFor, type WeekStepKey } from "../week";

/**
 * The reader map (the owner's word, 2026-11-22: "ensure each section that's
 * given to the user Is fully mapped out to we can control this spiderweb type
 * of system we are going to create").
 *
 * What a reader is given because of who they are is decided by a handful of
 * pure rules (flowSteps, readerType, road, week, plusIntro, space). This walks
 * every set of answers the questions can make, holds each to a whole week,
 * and writes what it found as docs/plans/reader-map.txt. The written copy is
 * held to the rules: change a rule and this fails until the map is written
 * again, so a change to what a reader is given is read as a difference in the
 * map and is never silent.
 *
 *   READER_MAP_WRITE=1 npx vitest run lib/onboarding/__tests__/readerMap.test.ts
 *
 * The plan it belongs to is docs/plans/reader-map.md.
 */

const FILE = path.resolve(__dirname, "../../../docs/plans/reader-map.txt");

/** A page's own name, as the English catalogue says it. A step with no name is a fault. */
function say(key: string): string {
  let at: unknown = en;
  if (at && typeof at === "object" && key in at) at = (at as Record<string, unknown>)[key];
  else for (const part of key.split(".")) at = at && typeof at === "object" ? (at as Record<string, unknown>)[part] : undefined;
  if (typeof at !== "string") throw new Error(`the catalogue has no ${key}`);
  return at;
}
const page = (k: WeekStepKey) => say(WEEK_STEPS[k].titleKey);

const BACKGROUNDS: readonly (Background | null)[] = [...ALL_BACKGROUNDS, null];
const ASKED_LEVELS: readonly (Level | null)[] = [...LEVELS, null];
const levelName = (l: Level | null) => l ?? "no level";
const backgroundName = (b: Background | null) => b ?? "not asked";

/** Every answer to "What are you looking for?": nothing, or up to three picks in the order tapped. */
const PICKS: readonly (readonly Intent[])[] = (() => {
  const out: Intent[][] = [[]];
  for (const a of INTENTS) {
    out.push([a]);
    for (const b of INTENTS) {
      if (b === a) continue;
      out.push([a, b]);
      for (const c of INTENTS) if (c !== a && c !== b) out.push([a, b, c]);
    }
  }
  return out;
})();

type Reader = { background: Background | null; level: Level | null; returning: boolean; picks: readonly Intent[] };

type Second = { level: Level | null; returning: boolean; says: string };
const SKIPPED: Second = { level: null, returning: false, says: "skipped" };

/**
 * What the second question offers, by the first answer. This is decided on the screen itself
 * (components/onboarding/OnboardingFlow.tsx, the three `step === "level"` screens), not in a rule
 * file: the Orthodox are asked where they are now, everyone else whether they have been to an
 * Orthodox church, and "Prefer not to say" keeps the question as it was. A test below reads that
 * file, so a screen that offers something else is seen here.
 */
function offered(background: Background | null): Second[] {
  if (background === "orthodox")
    return [
      { level: "practicing", returning: false, says: "practicing" },
      { level: "practicing", returning: true, says: "coming back" },
      { level: "learning", returning: false, says: "preparing" },
      SKIPPED,
    ];
  if (background === null || background === "prefer-not")
    return [
      { level: "inquirer", returning: false, says: "completely new" },
      { level: "learning", returning: false, says: "learning" },
      { level: "practicing", returning: false, says: "practicing" },
      SKIPPED,
    ];
  return [
    { level: "inquirer", returning: false, says: "not yet been to a church" },
    { level: "learning", returning: false, says: "going to a church" },
    SKIPPED,
  ];
}

/** Every reader the screens can make. */
const READERS: readonly Reader[] = (() => {
  const out: Reader[] = [];
  for (const background of BACKGROUNDS) for (const second of offered(background)) for (const picks of PICKS) out.push({ background, level: second.level, returning: second.returning, picks });
  return out;
})();

const baseWeek = (road: Road, lean: Lean) => (road === "protestant" ? PROTESTANT_WEEKS[lean] : ROAD_WEEKS[road]);

/** What one reader is given for a first week, or null: no road, and Purify as it always was. */
function weekOf(r: Reader): { road: Road; lean: Lean; steps: WeekStepKey[]; door: WeekStepKey } | null {
  const first = r.picks[0] ?? null;
  const road = roadOf({ background: r.background, level: r.level, intent: first, returning: r.returning });
  if (!road) return null;
  const lean = leanOf(first);
  return { road, lean, steps: weekFor({ road, lean, level: r.level, picks: r.picks }).map((s) => s.key), door: baseWeek(road, lean)[6] };
}

/** The whole web, walked once. */
const WEB = (() => {
  const roads = new Map<Road, { readers: number; weeks: Set<string>; doors: Set<WeekStepKey>; pages: Set<WeekStepKey> }>();
  const faults: string[] = [];
  let noRoad = 0;
  for (const r of READERS) {
    const w = weekOf(r);
    if (!w) {
      noRoad++;
      continue;
    }
    const at = `${backgroundName(r.background)}, ${levelName(r.level)}, ${r.picks.join("+") || "no pick"}`;
    if (w.steps.length !== WEEK_LENGTH) faults.push(`${at}: ${w.steps.length} steps`);
    if (new Set(w.steps.map((k) => WEEK_STEPS[k].href)).size !== w.steps.length) faults.push(`${at}: a page comes twice`);
    if (w.steps[w.steps.length - 1] !== w.door) faults.push(`${at}: the week does not end at ${w.door}`);
    const seen = roads.get(w.road) ?? { readers: 0, weeks: new Set<string>(), doors: new Set<WeekStepKey>(), pages: new Set<WeekStepKey>() };
    seen.readers++;
    seen.weeks.add(w.steps.join(">"));
    seen.doors.add(w.door);
    for (const k of w.steps) seen.pages.add(k);
    roads.set(w.road, seen);
  }
  const inBase = new Set<WeekStepKey>([...Object.values(ROAD_WEEKS).flat(), ...Object.values(PROTESTANT_WEEKS).flat()]);
  const met = new Set<WeekStepKey>([...roads.values()].flatMap((s) => [...s.pages]));
  return { roads, faults, noRoad, inBase, met };
})();

const ALL_STEPS = Object.keys(WEEK_STEPS) as WeekStepKey[];

function writtenMap(): string {
  const out: string[] = [
    "THE READER MAP",
    "",
    "What a reader is given because of who they are, written from the rules themselves",
    "(lib/onboarding: flowSteps, readerType, road, week, plusIntro, space). Never edited by hand:",
    "  READER_MAP_WRITE=1 npx vitest run lib/onboarding/__tests__/readerMap.test.ts",
    "The plan it belongs to is docs/plans/reader-map.md.",
    "",
    "1. THE QUESTIONS (a new reader, from the welcome, signed out)",
  ];
  const ask = (level: Level | null, accountAtEnd: boolean) =>
    flowSteps({ startAt: "welcome", level, role: null, country: null, remindersOn: false, roads: true, signedIn: false, clergyOpen: false, accountAtEnd }).join(" > ");
  for (const level of ASKED_LEVELS) out.push(`  ${levelName(level)}: ${ask(level, false)}`);
  out.push(`  where the account's test asks it last: ${ask("inquirer", true)}`);
  out.push(
    `  a priest in the United States, signed in: ${flowSteps({ startAt: "welcome", level: "practicing", role: "priest", country: "US", remindersOn: false, roads: true, signedIn: true, clergyOpen: true, accountAtEnd: false }).join(" > ")}`,
  );

  out.push("", "2. THE READER'S TYPE (how far along they are; it decides how Today looks). The rule; not every pair is offered on the screens, see 3.");
  for (const level of ASKED_LEVELS) {
    const by = new Map<string, string[]>();
    for (const b of BACKGROUNDS) {
      const t = readerTypeOf(level, b);
      by.set(t, [...(by.get(t) ?? []), backgroundName(b)]);
    }
    out.push(`  ${levelName(level)}: ${[...by].map(([t, bs]) => (by.size === 1 ? `${t}, whatever the background` : `${t} (${bs.join(", ")})`)).join("; ")}`);
  }

  out.push("", "3. THE ROAD (from the first two answers; it decides the first week)");
  out.push("  The second question is asked in the reader's own terms, so each background is offered its own answers.");
  for (const background of BACKGROUNDS)
    for (const second of offered(background)) {
      const roads = new Set<string>();
      for (const picks of PICKS) roads.add(roadOf({ background, level: second.level, intent: picks[0] ?? null, returning: second.returning }) ?? "no road");
      out.push(`  ${backgroundName(background)}, ${second.says}: ${[...roads].sort().join(" or ")}`);
    }

  out.push("", "4. THE FIRST WEEK (seven pages, one a day; the last is the road's door)");
  for (const road of ROADS) {
    if (road === "protestant") for (const lean of ["bible", "liturgical"] as const) out.push(`  protestant (${lean}): ${PROTESTANT_WEEKS[lean].map(page).join(" > ")}`);
    else out.push(`  ${road}: ${ROAD_WEEKS[road].map(page).join(" > ")}`);
  }
  out.push("", "  A reader's own picks then arrange it (week.ts, weekFor). What each pick brings:");
  for (const intent of INTENTS) {
    const by = new Map<string, string[]>();
    for (const level of ASKED_LEVELS) {
      const p = page(pickStep(intent, level));
      by.set(p, [...(by.get(p) ?? []), levelName(level)]);
    }
    out.push(`  ${intent}: ${[...by].map(([p, ls]) => (by.size === 1 ? p : `${p} (${ls.join(", ")})`)).join("; ")}`);
  }

  out.push("", "5. THE ONE PLUS CARD (on Today, once, after the first week)");
  for (const road of ROADS) out.push(`  ${road}: ${INTRO_FEATURE[road] ?? "none"}`);

  out.push("", "6. WHAT THE LEVEL SETS");
  for (const level of LEVELS) {
    const d = defaultsFor(level);
    out.push(`  ${level}: the ${d.calendar} calendar, fasting ${d.fasting}${asksRule(level) ? ", and asked for their rule" : ""}`);
  }

  out.push("", "7. THE COUNT");
  out.push(`  sets of answers the screens can give (a skip is an answer too): ${READERS.length}`);
  out.push(`  of them, with no road (Purify as it always was): ${WEB.noRoad}`);
  let weeks = 0;
  for (const road of ROADS) {
    const s = WEB.roads.get(road);
    if (!s) {
      out.push(`  ${road}: no set of answers leads here`);
      continue;
    }
    weeks += s.weeks.size;
    out.push(`  ${road}: ${s.readers} sets of answers, ${s.weeks.size} different weeks, ${s.pages.size} different pages, ending at ${[...s.doors].map(page).join(" or ")}`);
  }
  out.push(`  different first weeks in all: ${weeks}`);
  out.push(`  weeks that are not seven pages, hold a page twice or miss their door: ${WEB.faults.length}`);

  out.push("", "8. THE PAGES A WEEK CAN HOLD");
  for (const k of ALL_STEPS) {
    const note = !WEB.met.has(k) ? "  (in no week)" : !WEB.inBase.has(k) ? "  (only when a reader picks it)" : "";
    out.push(`  ${page(k)}: ${WEEK_STEPS[k].href}${note}`);
  }
  return `${out.join("\n")}\n`;
}

describe("every reader the questions can make", () => {
  it("is given a whole week, or Purify as it always was: seven pages, none twice, ending at the road's own door", () => {
    expect(READERS.length).toBeGreaterThan(30_000);
    expect(WEB.faults.slice(0, 10)).toEqual([]);
  });

  it("is led, on every road outside the practicing, to a parish or a first Liturgy", () => {
    // road.ts: "Every road outside the practicing ends at the same door: a parish, and a first Liturgy."
    for (const road of ROADS) {
      if (road === "practicing") continue;
      for (const door of WEB.roads.get(road)?.doors ?? []) expect(["parish", "firstLiturgy"], `${road} ends at ${door}`).toContain(door);
    }
  });

  it("can reach every road", () => {
    for (const road of ROADS) expect(WEB.roads.get(road)?.readers ?? 0, road).toBeGreaterThan(0);
  });
});

describe("the second question", () => {
  it("is mirrored here as the screen itself asks it", () => {
    const flow = fs.readFileSync(path.resolve(__dirname, "../../../components/onboarding/OnboardingFlow.tsx"), "utf8");
    // Its three screens, by the first answer.
    expect(flow).toContain('{step === "level" && roads && background === "orthodox" && (');
    expect(flow).toContain('{step === "level" && roads && background !== "orthodox" && background !== "prefer-not" && background !== null && (');
    expect(flow).toContain('{step === "level" && (!roads || background === "prefer-not" || background === null) && (');
    // And what they offer between them: offered() above holds the same answers, no more and no fewer.
    const offers = (call: string) => flow.split(call).length - 1;
    expect(offers('chooseLevel("practicing", true)')).toBe(1);
    expect(offers('chooseLevel("practicing")')).toBe(2);
    expect(offers('chooseLevel("learning")')).toBe(3);
    expect(offers('chooseLevel("inquirer")')).toBe(2);
  });
});

describe("the reader map", () => {
  it("holds in a week every page the list names, but the one named here", () => {
    // "A path through the Fathers" is in the list of steps and in no week: no road holds it and no pick
    // brings it. Named, so that a second page written into the list and led to by nothing is seen at once.
    expect(ALL_STEPS.filter((k) => !WEB.met.has(k))).toEqual(["readingPaths"]);
  });

  it("is written from the rules, and the written copy is the rules' own", () => {
    const now = writtenMap();
    if (process.env.READER_MAP_WRITE === "1") fs.writeFileSync(FILE, now);
    const written = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8") : "";
    expect(written, "a rule changed what a reader is given: write the map again (the command is at the head of this file) and read the difference").toBe(now);
  });
});
