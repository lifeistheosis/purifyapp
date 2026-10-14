// What the app hands the widgets, worked out without a phone. Each entry is a
// string the plugin keeps as it is, so what is held here is exactly what a
// widget reads. The why is in ../state.ts.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import nextUpdate from "@/data/changelog/next-update.json";
import type { StripDay } from "@/lib/streak/compute";

import { WIDGET_KEYS } from "../bridge";
import {
  PRAYED_RULES,
  calendarStyleEntry,
  patronEntry,
  patronFacts,
  prayedEntry,
  readPatronAnswer,
  streakEntry,
  updateEntry,
  widgetEntries,
  type StreakFacts,
} from "../state";

const TODAY = "2026-10-14";

/** Seven strip days ending on TODAY, in the states given, oldest first. */
function strip(...states: StripDay["state"][]): StripDay[] {
  return states.map((state, i) => ({ date: `2026-10-${String(8 + i).padStart(2, "0")}`, state }));
}

const VIEW: StreakFacts = {
  ready: true,
  current: 12,
  keptToday: false,
  strip: strip("kept", "kept", "saved", "kept", "kept", "kept", "today"),
};

describe("the calendar", () => {
  it("is the reader's reckoning, New unless it is Old", () => {
    expect(calendarStyleEntry("old")).toBe("old");
    expect(calendarStyleEntry("new")).toBe("new");
    expect(calendarStyleEntry(undefined)).toBe("new");
    expect(calendarStyleEntry("julian")).toBe("new");
  });
});

describe("the streak", () => {
  it("carries the count, today, the week oldest first, and the day it is true on", () => {
    expect(JSON.parse(streakEntry(VIEW, TODAY)!)).toEqual({
      count: 12,
      keptToday: false,
      // A day a save held is drawn as kept, and today is not kept yet.
      week: [true, true, true, true, true, true, false],
      on: TODAY,
    });
  });

  it("says nothing until the store has an answer", () => {
    expect(streakEntry({ ...VIEW, ready: false }, TODAY)).toBeUndefined();
    expect(streakEntry(null, TODAY)).toBeUndefined();
    expect(streakEntry(VIEW, "today")).toBeUndefined();
  });

  it("always hands over seven days, the last of them today", () => {
    const short = JSON.parse(streakEntry({ ...VIEW, strip: strip("kept", "today") }, TODAY)!);
    expect(short.week).toEqual([false, false, false, false, false, true, false]);
    const long = JSON.parse(
      streakEntry({ ...VIEW, strip: [...strip("missed", "missed"), ...strip("kept", "kept", "kept", "kept", "kept", "kept", "kept")] }, TODAY)!,
    );
    expect(long.week).toEqual([true, true, true, true, true, true, true]);
  });

  it("never hands over a count a widget cannot draw", () => {
    expect(JSON.parse(streakEntry({ ...VIEW, current: -3 }, TODAY)!).count).toBe(0);
    expect(JSON.parse(streakEntry({ ...VIEW, current: Number.NaN }, TODAY)!).count).toBe(0);
    expect(JSON.parse(streakEntry({ ...VIEW, current: 4.7, keptToday: true }, TODAY)!)).toMatchObject({ count: 4, keptToday: true });
  });
});

describe("the prayers", () => {
  it("are the Morning and Evening Rules, by the ids their marks are kept under", () => {
    expect(PRAYED_RULES).toEqual({ morning: "morning", evening: "evening" });
  });

  it("hand over the last day each rule was finished", () => {
    const morning = ["2026-10-12", "2026-10-14", "2026-10-13"];
    const evening = ["2026-10-10"];
    expect(JSON.parse(prayedEntry(morning, evening, TODAY))).toEqual({ morning: TODAY, evening: "2026-10-10" });
  });

  it("say null for a rule never finished, and pass over what is not a day", () => {
    expect(JSON.parse(prayedEntry([], ["nonsense", 5, null, "2026-02-30"], TODAY))).toEqual({
      morning: null,
      evening: null,
    });
  });

  it("do not count a day that has not come here yet", () => {
    // A mark from a phone in a zone ahead is tomorrow's, not today's.
    expect(JSON.parse(prayedEntry(["2026-10-13", "2026-10-15"], [], TODAY)).morning).toBe("2026-10-13");
  });
});

describe("the server's word on the patron", () => {
  it("is a saint, none, or unknown", () => {
    expect(readPatronAnswer(200, { slug: "nicholas-the-wonderworker" })).toEqual({ kind: "saint", slug: "nicholas-the-wonderworker" });
    expect(readPatronAnswer(200, { slug: null })).toEqual({ kind: "none" });
    // Signed out: the widget asks the reader to choose one.
    expect(readPatronAnswer(401, null)).toEqual({ kind: "none" });
  });

  it("is unknown when the server could not say, so the widget keeps its saint", () => {
    for (const [status, body] of [
      [null, null],
      [503, { error: "Not available yet." }],
      [500, null],
      [200, null],
      [200, {}],
      [200, { slug: "../account" }],
      [200, { slug: 7 }],
    ] as const) {
      expect(readPatronAnswer(status, body), `${status} ${JSON.stringify(body)}`).toEqual({ kind: "unknown" });
    }
  });
});

describe("the patron saint", () => {
  const nicholas = { kind: "saint", slug: "nicholas-the-wonderworker" } as const;

  it("is the saint in brief, with the next name day on the reader's calendar", () => {
    expect(patronFacts(nicholas, TODAY, "new")).toEqual({
      slug: "nicholas-the-wonderworker",
      name: "St. Nicholas the Wonderworker",
      nameDay: "2026-12-06",
      daysToNameDay: 53,
      // The rights to this icon are not settled.
      icon: null,
    });
  });

  it("keeps the name day thirteen days later on the Old Calendar", () => {
    expect(patronFacts(nicholas, TODAY, "old")).toMatchObject({ nameDay: "2026-12-19", daysToNameDay: 66 });
  });

  it("says 0 on the day, and next year's the day after", () => {
    expect(patronFacts(nicholas, "2026-12-06", "new")).toMatchObject({ nameDay: "2026-12-06", daysToNameDay: 0 });
    expect(patronFacts(nicholas, "2026-12-07", "new")).toMatchObject({ nameDay: "2027-12-06", daysToNameDay: 364 });
  });

  it("finds a late December feast in the new year on the Old Calendar", () => {
    const stephen = { kind: "saint", slug: "stephen-the-protomartyr" } as const;
    expect(patronFacts(stephen, "2027-01-05", "old")).toMatchObject({ nameDay: "2027-01-09", daysToNameDay: 4 });
  });

  it("carries the icon only when its rights are settled, at its place in the bundle", () => {
    const arsenius = patronFacts({ kind: "saint", slug: "arsenius-the-great" }, TODAY, "new");
    expect(arsenius?.icon).toBe("public/saints/icons/arsenius-the-great.jpg");
    // The path is the file's place in the repository too, which is what the
    // bundle copies.
    expect(readFileSync(arsenius!.icon!).length).toBeGreaterThan(1000);
  });

  it("is undefined while unknown, and null with no saint to show", () => {
    expect(patronFacts({ kind: "unknown" }, TODAY, "new")).toBeUndefined();
    expect(patronFacts({ kind: "none" }, TODAY, "new")).toBeNull();
    expect(patronFacts({ kind: "saint", slug: "no-such-saint" }, TODAY, "new")).toBeNull();
  });

  it("hands over the four fields of the contract and nothing else", () => {
    const entry = patronEntry(patronFacts(nicholas, TODAY, "new"));
    expect(JSON.parse(entry!)).toEqual({
      slug: "nicholas-the-wonderworker",
      name: "St. Nicholas the Wonderworker",
      nameDay: "2026-12-06",
      icon: null,
    });
    expect(patronEntry(null)).toBeNull();
    expect(patronEntry(undefined)).toBeUndefined();
  });
});

describe("the next update", () => {
  it("is the committed file, each field null until the owner sets it", () => {
    expect(nextUpdate).toMatchObject({ name: null, version: null, date: null });
    expect(typeof (nextUpdate as { comment?: unknown }).comment).toBe("string");
    expect(JSON.parse(updateEntry())).toEqual({ name: null, version: null, date: null });
  });

  it("hands over a set update as it is", () => {
    expect(JSON.parse(updateEntry({ name: "The October Update", version: "1.6", date: "2026-11-04" }))).toEqual({
      name: "The October Update",
      version: "1.6",
      date: "2026-11-04",
    });
  });

  it("leaves out what is not a date or will not fit", () => {
    expect(JSON.parse(updateEntry({ name: " ", version: 1.6, date: "2026-02-30" }))).toEqual({
      name: null,
      version: null,
      date: null,
    });
    expect(JSON.parse(updateEntry({ name: "x".repeat(61), date: "Nov 4" }))).toEqual({ name: null, version: null, date: null });
    expect(JSON.parse(updateEntry(null))).toEqual({ name: null, version: null, date: null });
  });
});

describe("every entry at once", () => {
  const facts = patronFacts({ kind: "saint", slug: "nicholas-the-wonderworker" }, TODAY, "old");

  it("is the six keys of the contract, each a string the plugin keeps", () => {
    const entries = widgetEntries({
      today: TODAY,
      calendarStyle: "old",
      labels: { today: "Today" },
      streak: VIEW,
      prayed: { morning: [TODAY], evening: [] },
      patron: facts,
    });
    expect(Object.keys(entries).sort()).toEqual([...WIDGET_KEYS].sort());
    for (const value of Object.values(entries)) expect(typeof value).toBe("string");
    expect(entries.calendarStyle).toBe("old");
    expect(JSON.parse(entries.labels!)).toEqual({ today: "Today" });
    expect(JSON.parse(entries.prayed!)).toEqual({ morning: TODAY, evening: null });
    expect(JSON.parse(entries.patron!).nameDay).toBe("2026-12-19");
    expect(JSON.parse(entries.update!)).toEqual({ name: null, version: null, date: null });
  });

  it("leaves what it does not know as the phone has it, and forgets a patron no longer there", () => {
    const entries = widgetEntries({
      today: TODAY,
      calendarStyle: "new",
      labels: null,
      streak: { ...VIEW, ready: false },
      prayed: { morning: [], evening: [] },
      patron: undefined,
    });
    expect(entries.labels).toBeUndefined();
    expect(entries.streak).toBeUndefined();
    expect(entries.patron).toBeUndefined();
    expect(widgetEntries({ today: TODAY, calendarStyle: "new", labels: null, streak: null, prayed: { morning: [], evening: [] }, patron: null }).patron).toBeNull();
  });
});
