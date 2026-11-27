// The fast is not set on a Catholic's or a Protestant's day (his word,
// 2026-11-27: "make it so that protestants or Roman Catholics don't see
// anything fast related that's applied (but they can still learn about it)").
// lib/onboarding/road.ts holds the roads (fastApplies); the reader's space
// carries it (lib/onboarding/state.ts, parseSpaceSnapshot); each place that
// sets the fast on the reader's own day reads it. What the fast is stays
// theirs to read: the Fast's own page and search are untouched.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { FAST_NOT_APPLIED, ROADS, fastApplies, roadOf } from "../road";
import { parseSpaceSnapshot } from "../state";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the fast is not set on a Catholic's or a Protestant's day", () => {
  it("names the two roads, and every other road and no road keep the fast", () => {
    expect([...FAST_NOT_APPLIED].sort()).toEqual(["catholic", "protestant"]);
    for (const road of ROADS) expect(fastApplies(road), road).toBe(road !== "catholic" && road !== "protestant");
    expect(fastApplies(null)).toBe(true);
  });

  it("goes by the road, so a Catholic or a Protestant at the services meets the fast as a catechumen", () => {
    expect(roadOf({ background: "catholic", level: "inquirer", intent: null, returning: false })).toBe("catholic");
    expect(roadOf({ background: "catholic", level: "learning", intent: null, returning: false })).toBe("catechumen");
    expect(fastApplies(roadOf({ background: "protestant", level: "learning", intent: null, returning: false }))).toBe(true);
  });

  it("carries it in the reader's space: off the fast's roads the fast shows as hidden, whatever rule was kept", () => {
    // level|intent|fasting|background|returning|intents
    expect(parseSpaceSnapshot("inquirer||strict|catholic||")).toMatchObject({ fastApplies: false, fasting: "hidden" });
    expect(parseSpaceSnapshot("||modified|protestant||")).toMatchObject({ fastApplies: false, fasting: "hidden" });
    expect(parseSpaceSnapshot("learning||modified|catholic||")).toMatchObject({ fastApplies: true, fasting: "modified" });
    expect(parseSpaceSnapshot("practicing||strict|orthodox||")).toMatchObject({ fastApplies: true, fasting: "strict" });
    // The server's first frame: no answers, the fast as it always showed.
    expect(parseSpaceSnapshot("||strict|||")).toMatchObject({ fastApplies: true, fasting: "strict" });
  });

  it("each place that sets the fast on the reader's day reads it", () => {
    // Today: the rail and the date line honour the rule, which is hidden off the fast's roads.
    expect(read("components/today/ChurchTodayRail.tsx")).toContain('const view = fasting === "hidden" ? null : fastView(fast.kind, fasting);');
    expect(read("components/today/GreetingHeader.tsx")).toMatch(/dayMarks\(lead, day\.fast, fasting\)/);
    // Today: the Nativity Fast's path band, which names the fast and counts its days (found on the export's walk).
    expect(read("components/today/ChurchTodayRail.tsx")).toContain("const path = nativity && fastApplies");
    // Today: the Nativity Fast's count of days.
    expect(read("components/today/NativityStarCard.tsx")).toContain("const shown = fastApplies && n !== null && n <= days.length;");
    // Prayers: the date line's register, its tone, the day card, and the fast day's prayer.
    expect(read("components/prayers/TodayMasthead.tsx")).toContain("{!fastApplies ? null : day ? (");
    expect(read("components/prayers/PrayersTodayClient.tsx")).toContain('fast: fastApplies ? day.fast.kind : "normal",');
    const card = read("components/prayers/PrayersDayCard.tsx");
    expect(card).toContain("{fastApplies ? <span aria-hidden className={`inline-block h-1.5 w-1.5");
    expect(card).toMatch(/\{fastApplies \? \(\s*<>\s*\{t\(`calendar\.fast\.\$\{day\.fast\.ruleId\}\.label`\)\}/);
    expect(read("components/prayers/PrayNow.tsx")).toContain("isFast: fastApplies && isFastDay(today, style),");
    // The journal's day lines.
    expect(read("components/journal/TodayPage.tsx")).toContain("const fasting = fastApplies && (");
    expect(read("components/journal/JournalFeed.tsx")).toContain("const fast = fastApplies && church.fast ?");
    // Settings: no fasting rule to choose.
    expect(read("components/settings/SettingsClient.tsx")).toMatch(/\{fastApplies \? \(\s*<Row icon=\{<Wheat/);
  });

  it("leaves what the fast is for them to read: the Fast's own page and search", () => {
    expect(read("components/fasting/FastingTrackerClient.tsx")).not.toContain("fastApplies");
    expect(read("lib/search/buildCorpus.ts")).toContain('{ id: "page-fasting", label: "The Fast", href: "/fasting"');
  });
});
