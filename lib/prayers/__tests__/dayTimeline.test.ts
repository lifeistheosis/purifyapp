import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { DAY_PARTS, dayTimeline, hoursTimeline, litNow, partAt } from "@/lib/prayers/dayTimeline";
import { currentHourSlug, listHours } from "@/lib/prayers/hours";
import { getRuleMeta } from "@/lib/prayers/rules";
import { timeOfDayAt } from "@/lib/prayers/suggest";

/**
 * The day as a timeline (1.7): the Hours, and the day's prayers by part of
 * the day, with the one the clock is in lit. Every hour of the day lights
 * exactly one Hour and one part, and both come from the answers the rest of
 * the app gives (currentHourSlug and timeOfDayAt), never an hour of its own.
 */

const messages = en as Record<string, string>;
const at = (h: number) => new Date(2026, 9, 16, h, 30, 0);

describe("the Hours' timeline", () => {
  it("is the five Hours in the order of the day, each with its length and its page", () => {
    const slots = hoursTimeline();
    expect(slots.map((s) => s.id)).toEqual(listHours().map((h) => h.slug));
    const hours = slots.map((s) => s.hour ?? -1);
    expect([...hours].sort((a, b) => a - b)).toEqual(hours);
    for (const s of slots) {
      expect(s.href).toBe(`/prayers/hours/${s.id}`);
      expect(s.minutes, s.id).toBeGreaterThan(0);
      expect(messages[s.titleKey], s.titleKey).toBeTypeOf("string");
    }
  });

  it("lights the Hour the clock is in, at every hour of the day", () => {
    for (let h = 0; h < 24; h++) {
      expect(litNow(at(h)).hour, `hour ${h}`).toBe(currentHourSlug(h));
    }
  });
});

describe("the day's timeline", () => {
  const groups = dayTimeline();

  it("runs through the five parts of the day in order", () => {
    expect(groups.map((g) => g.part)).toEqual([...DAY_PARTS]);
  });

  it("holds the daily rule's prayer for each part, and every Hour once, in the part its hour falls in", () => {
    const rules = groups.map((g) => g.slots.find((s) => s.hour === undefined)?.id);
    expect(rules).toEqual(["upon-waking", "morning", "midday", "evening", "before-sleep"]);
    const hours = groups.flatMap((g) => g.slots.filter((s) => s.hour !== undefined).map((s) => ({ id: s.id, part: g.part, hour: s.hour! })));
    expect(hours.map((h) => h.id).sort()).toEqual(listHours().map((h) => h.slug).sort());
    for (const h of hours) expect(partAt(h.hour), h.id).toBe(h.part);
    // As the clock reads them today: the First Hour at sunrise is on waking,
    // the Sixth and the Ninth are midday's, Compline the night's.
    const partOf = (id: string) => hours.find((h) => h.id === id)?.part;
    expect([partOf("first-hour"), partOf("third-hour"), partOf("sixth-hour"), partOf("ninth-hour"), partOf("compline")]).toEqual([
      "waking",
      "morning",
      "midday",
      "midday",
      "night",
    ]);
  });

  it("closes the night with the prayers before sleep, after Compline", () => {
    const night = groups.find((g) => g.part === "night")!;
    expect(night.slots.map((s) => s.id)).toEqual(["compline", "before-sleep"]);
  });

  it("names every prayer in the catalogs and links each to a page the registry knows", () => {
    for (const s of groups.flatMap((g) => g.slots)) {
      expect(messages[s.titleKey], s.titleKey).toBeTypeOf("string");
      expect(getRuleMeta(s.id)?.href ?? s.href, s.id).toBe(s.href);
      expect(messages[`prayers.timeline.part.${groups.find((g) => g.slots.includes(s))!.part}`]).toBeTypeOf("string");
    }
  });

  it("lights the part the Pray now row is in, at every hour of the day", () => {
    for (let h = 0; h < 24; h++) {
      expect(litNow(at(h)).part, `hour ${h}`).toBe(timeOfDayAt(at(h)));
    }
  });
});
