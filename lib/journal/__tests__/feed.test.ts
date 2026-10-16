// The journal as one list (1.7, the owner's note 23): verse notes and the
// journal's own entries by the day they were written, the kinds, and the
// reading plan's questions waiting for an answer.

import { afterEach, describe, expect, it } from "vitest";

import type { JournalEntry } from "@/lib/bible/journal";
import type { PlansState } from "@/lib/plans/progress";

import type { JournalRecord } from "../entries";
import { byDay, emptyPromptKey, filterKind, journalChips, journalFeed, localDayKey, planPrompts } from "../feed";

const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

const note = (verse: number, at: string | null): JournalEntry => ({ book: "john", chapter: 3, verse, note: `Note on ${verse}`, at });
const record = (id: string, createdAt: string, extra: Partial<JournalRecord> = {}): JournalRecord => ({
  id,
  kind: "reflection",
  body: `Entry ${id}`,
  createdAt,
  updatedAt: createdAt,
  ...extra,
});

describe("one list, by day", () => {
  it("puts notes and entries together, newest first, undated notes last", () => {
    const feed = journalFeed([note(16, "2026-10-03T09:00:00.000Z"), note(17, null)], [record("a", "2026-10-05T09:00:00.000Z"), record("b", "2026-10-01T09:00:00.000Z")]);
    expect(feed.map((i) => i.key)).toEqual(["rec:a", "note:john:3:16", "rec:b", "note:john:3:17"]);
    expect(feed[1]).toMatchObject({ kind: "reflection", source: { type: "verse", book: "john", chapter: 3, verse: 16 } });
  });

  it("leaves out what was removed", () => {
    const feed = journalFeed([], [record("a", "2026-10-05T09:00:00.000Z", { deletedAt: "2026-10-06T09:00:00.000Z" }), record("b", "2026-10-01T09:00:00.000Z")]);
    expect(feed.map((i) => i.key)).toEqual(["rec:b"]);
  });

  it("files an entry under the day it was written where the reader is, across midnight", () => {
    // 23:30 on the 4th in New York is 03:30 on the 5th in UTC.
    process.env.TZ = "America/New_York";
    const late = "2026-10-05T03:30:00.000Z";
    const morning = "2026-10-05T13:00:00.000Z";
    expect(localDayKey(late)).toBe("2026-10-04");
    const groups = byDay(journalFeed([], [record("late", late), record("morning", morning)]));
    expect(groups.map((g) => [g.day, g.items.map((i) => i.key)])).toEqual([
      ["2026-10-05", ["rec:morning"]],
      ["2026-10-04", ["rec:late"]],
    ]);
    // In Auckland (UTC+13 in October) the same two moments fall on the 5th
    // in the afternoon and on the 6th before dawn.
    process.env.TZ = "Pacific/Auckland";
    expect(byDay(journalFeed([], [record("late", late), record("morning", morning)])).map((g) => g.day)).toEqual(["2026-10-06", "2026-10-05"]);
    // And in London both are the 5th: one group.
    process.env.TZ = "Europe/London";
    expect(byDay(journalFeed([], [record("late", late), record("morning", morning)])).map((g) => g.day)).toEqual(["2026-10-05"]);
  });

  it("keeps the notes from before notes were dated in a group of their own", () => {
    const groups = byDay(journalFeed([note(16, null), note(17, null)], [record("a", "2026-10-05T09:00:00.000Z")]));
    expect(groups.map((g) => g.day)).toEqual([localDayKey("2026-10-05T09:00:00.000Z"), "undated"]);
  });
});

describe("the kinds", () => {
  const feed = journalFeed([note(16, "2026-10-03T09:00:00.000Z")], [
    record("p", "2026-10-04T09:00:00.000Z", { kind: "prayer" }),
    record("q", "2026-10-05T09:00:00.000Z", { kind: "question" }),
  ]);

  it("filter by reflection, prayer and question, a verse note counting as a reflection", () => {
    expect(filterKind(feed, "reflection").map((i) => i.key)).toEqual(["note:john:3:16"]);
    expect(filterKind(feed, "prayer").map((i) => i.key)).toEqual(["rec:p"]);
    expect(filterKind(feed, "question").map((i) => i.key)).toEqual(["rec:q"]);
    expect(filterKind(feed, "all")).toHaveLength(3);
  });

  it("offer a chip only for a kind that has an entry", () => {
    expect(journalChips(feed)).toEqual(["all", "reflection", "prayer", "question"]);
    expect(journalChips(filterKind(feed, "prayer"))).toEqual(["all", "prayer"]);
  });
});

describe("the reading plan's questions", () => {
  const questionsOf = (planId: string, day: number) => [
    { key: `${planId}.d${day + 1}.q`, text: `Day ${day + 1}'s own question` },
    { key: `${planId}.q.${(day % 8) + 1}`, text: "A question from the plan's pool" },
  ];
  const state: PlansState = {
    gospels: { startedOn: "2026-10-01", done: { "0": "2026-10-01", "1": "2026-10-02", "4": "2026-10-05" } },
    psalter: { startedOn: "2026-09-20", done: { "0": "2026-09-20" } },
  };
  const now = new Date("2026-10-06T12:00:00");

  it("come from the day read most recently, never a backlog of every day", () => {
    const waiting = planPrompts(state, [], [], questionsOf, now);
    expect(waiting).toMatchObject({ planId: "gospels", day: 4, readOn: "2026-10-05" });
    expect(waiting?.questions.map((q) => q.key)).toEqual(["gospels.d5.q", "gospels.q.5"]);
  });

  it("drop each question once it has an answer, and go once all have one", () => {
    const answer = (key: string): JournalRecord =>
      record(key, "2026-10-05T20:00:00.000Z", { kind: "question", prompt: { key, text: "?" }, source: { type: "plan-day", planId: "gospels", day: 4, label: "Matthew 5" } });
    expect(planPrompts(state, [answer("gospels.d5.q")], [], questionsOf, now)?.questions.map((q) => q.key)).toEqual(["gospels.q.5"]);
    expect(planPrompts(state, [answer("gospels.d5.q"), answer("gospels.q.5")], [], questionsOf, now)).toBeNull();
  });

  it("go when the day is put aside, and do not fall back to an older day", () => {
    expect(planPrompts(state, [], ["gospels:4"], questionsOf, now)).toBeNull();
  });

  it("are not asked two weeks after the day was read", () => {
    expect(planPrompts(state, [], [], questionsOf, new Date("2026-10-25T12:00:00"))).toBeNull();
    expect(planPrompts({}, [], [], questionsOf, now)).toBeNull();
  });
});

describe("an empty journal", () => {
  it("offers one of seven prompts, by the day of the week", () => {
    const keys = new Set(Array.from({ length: 7 }, (_, i) => emptyPromptKey(new Date(2026, 9, 4 + i))));
    expect(keys.size).toBe(7);
    expect([...keys].every((k) => /^journal\.prompt\.[0-6]$/.test(k))).toBe(true);
  });
});
