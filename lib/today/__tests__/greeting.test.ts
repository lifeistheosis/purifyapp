import { describe, expect, it } from "vitest";

import { commemorationsOn, fastingStatus, shiftForStyle, type CalStyle } from "@/lib/calendar/orthodox";
import { GREAT_FEASTS, feastDate } from "@/lib/shop/feasts";

import {
  HOUR_VERSES,
  dayLead,
  dayMarks,
  greatFeastOn,
  greetingKind,
  hourPrayer,
  learningLineKey,
  type DayLead,
} from "../greeting";
import { loadHourVerses } from "../hourVerse.server";

// The greeting at the top of Today, by the reader's type (1.8, the owner's
// round 14, transitionary): the Orthodox reader is given the day's feast or
// saint with the day's marks and the hour's prayers, the reader who is
// learning a line naming the day, the reader new to the faith a psalm verse
// for the hour. Real calendar data only, read as Today reads it
// (lib/calendar/useChurchDay.ts).

const civil = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));

/** What useChurchDay hands the greeting, and the lookup day it uses. */
function churchDay(today: Date, style: CalStyle = "new") {
  const lookup = shiftForStyle(today, style);
  const commemorations = commemorationsOn(lookup);
  const headline = commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  return { day: { today, headline, fast: fastingStatus(today, style) }, lookup };
}

function leadOn(today: Date, style: CalStyle = "new"): DayLead | null {
  const { day, lookup } = churchDay(today, style);
  return dayLead(day, lookup);
}

describe("the Orthodox reader's greeting", () => {
  it("leads 8 November with the Synaxis, the Archangel's icon and the hymns the app holds", () => {
    expect(leadOn(civil(2026, 11, 8))).toEqual({
      name: "Synaxis of the Holy Archangel Michael and All the Bodiless Powers",
      kind: "feast",
      iconUrl: "/saints/icons/archangel-michael.v2.jpg",
      hymnsHref: "/saints/archangel-michael#hymns",
    });
  });

  it("calls a great feast one, and offers no hymns where the app holds none", () => {
    expect(leadOn(civil(2026, 11, 21))).toEqual({
      name: "Entrance of the Most Holy Theotokos into the Temple",
      kind: "great-feast",
      iconUrl: "/saints/icons/theotokos.jpg",
      hymnsHref: null,
    });
  });

  it("lets the day's saint lead on a day with no feast", () => {
    expect(leadOn(civil(2026, 10, 28))).toEqual({
      name: "Great-martyr Paraskeva of Iconium",
      kind: "saint",
      iconUrl: null,
      hymnsHref: null,
    });
  });

  it("keeps a fixed great feast thirteen days later on the old calendar", () => {
    expect(leadOn(civil(2026, 12, 4), "old")).toMatchObject({ name: "Entrance of the Most Holy Theotokos into the Temple", kind: "great-feast" });
    expect(leadOn(civil(2026, 11, 21), "old")?.kind).not.toBe("great-feast");
  });

  it("names the feasts reckoned from Pascha, which the menaion's days do not carry", () => {
    for (const key of ["entry-into-jerusalem", "pascha", "ascension", "pentecost"]) {
      const feast = GREAT_FEASTS.find((f) => f.key === key)!;
      const day = feastDate(feast, 2027);
      for (const style of ["new", "old"] as const) {
        expect(leadOn(day, style), `${key} ${style}`).toMatchObject({ name: feast.name, kind: "great-feast", iconUrl: null });
      }
    }
  });

  it("finds each fixed great feast as the calendar's own feast of its day, so its icon comes with it", () => {
    for (const feast of GREAT_FEASTS) {
      if ("fromPascha" in feast.on) continue;
      const day = civil(2026, feast.on.month, feast.on.day);
      expect(greatFeastOn(day, day)?.key, feast.key).toBe(feast.key);
      expect(churchDay(day).day.headline?.name, feast.key).toBe(feast.name);
    }
    expect(greatFeastOn(civil(2026, 11, 8), civil(2026, 11, 8))).toBeNull();
  });

  it("marks the date with the feast and with the fast as the reader keeps it", () => {
    const nov8 = churchDay(civil(2026, 11, 8)).day;
    expect(dayMarks(leadOn(nov8.today), nov8.fast, "strict")).toEqual({ feast: "feast", fast: { kind: "calendar", ruleId: "noFast" } });
    const entry = churchDay(civil(2026, 11, 21)).day;
    expect(dayMarks(leadOn(entry.today), entry.fast, "strict").feast).toBe("great");
    // A Wednesday: the calendar's rule, the plain line under the simpler
    // rule, and nothing for a reader who hid fasting.
    const wed = churchDay(civil(2026, 10, 28)).day;
    const lead = leadOn(wed.today);
    expect(dayMarks(lead, wed.fast, "strict")).toEqual({ feast: null, fast: { kind: "calendar", ruleId: "wednesdayFast" } });
    expect(dayMarks(lead, wed.fast, "modified").fast).toEqual({ kind: "plain" });
    expect(dayMarks(lead, wed.fast, "hidden").fast).toBeNull();
  });

  it("offers the hour's prayers the Pray rail leads with", () => {
    expect(hourPrayer("morning", null)).toEqual({ href: "/prayers/morning", titleKey: "today.prayNow.morningFallback", minutes: 8 });
    expect(hourPrayer("evening", null)).toEqual({ href: "/prayers/evening", titleKey: "today.prayNow.eveningFallback", minutes: 8 });
    // A rule of the reader's own leads, as on the rail.
    expect(hourPrayer("evening", { part: "evening", href: "/prayers/personal/evening", minutes: 12 })).toEqual({
      href: "/prayers/personal/evening",
      titleKey: "prayers.mine.eveningTitle",
      minutes: 12,
    });
  });
});

describe("which greeting each reader is given", () => {
  const lead = leadOn(civil(2026, 11, 8));

  it("gives the Orthodox reader the day, the learning reader a line, the new reader a verse", () => {
    expect(greetingKind("orthodox", lead, true)).toBe("lead");
    expect(greetingKind("learning", lead, true)).toBe("line");
    expect(greetingKind("new", lead, true)).toBe("verse");
  });

  it("falls back to the greeting as it was when there is nothing to name or no verse", () => {
    expect(greetingKind("orthodox", null, true)).toBe("plain");
    expect(greetingKind("learning", null, true)).toBe("plain");
    expect(greetingKind("new", lead, false)).toBe("plain");
  });

  it("names the day for the learning reader by what leads it", () => {
    expect(learningLineKey(lead!)).toBe("today.greet.feastLine");
    expect(learningLineKey(leadOn(civil(2026, 11, 21))!)).toBe("today.greet.greatFeastLine");
    expect(learningLineKey(leadOn(civil(2026, 10, 28))!)).toBe("today.greet.saintLine");
  });
});

describe("the new reader's verse for the hour", () => {
  it("is Psalm 5:3 in the morning and Psalm 140:2 in the evening, the app's own LXX numbering", () => {
    expect(HOUR_VERSES.morning).toEqual({ chapter: 5, verse: 3 });
    expect(HOUR_VERSES.evening).toEqual({ chapter: 140, verse: 2 });
  });

  it("is read from the Psalter's own files, one verse for each part of the day", async () => {
    const verses = await loadHourVerses();
    expect(verses).not.toBeNull();
    expect(verses!.morning.ref).toBe("5:3");
    expect(verses!.morning.text).toMatch(/^In the morning thou shalt hear my voice/);
    expect(verses!.evening.ref).toBe("140:2");
    expect(verses!.evening.text).toMatch(/^Let my prayer be set forth before thee as incense/);
    expect(verses!.afternoon.ref).toBe("54:17");
    expect(verses!.afternoon.text).toMatch(/at noon/);
  });
});
