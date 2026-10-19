import { describe, expect, it } from "vitest";

import { chantIndex } from "@/lib/chants/registry.server";
import { FEAST_AHEAD_DAYS, SHORT_SECONDS, chantsHome, inTradition, isDue, traditionsIn } from "@/lib/chants/select";
import type { ChantIndexRow, ChantTradition, ChantWhen } from "@/lib/chants/types";

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));

function row(slug: string, over: Partial<ChantIndexRow> = {}): ChantIndexRow {
  const tradition: ChantTradition = over.traditions?.[0] ?? "greek";
  return {
    slug,
    key: slug,
    title: slug,
    kind: "troparion",
    when: { anytime: true },
    addedOn: "2026-10-01",
    traditions: [tradition],
    shortest: 180,
    variants: [
      { id: "a", language: "el", label: "Ελληνικά", tradition, performer: null, audio: { src: `/audio/chants/${slug}/a.mp3`, durationSec: over.shortest ?? 180 }, preview: { from: 0, to: 10 } },
    ],
    ...over,
  };
}

describe("the Chants home with the library as it is today", () => {
  // One chant: the Prayer Rope Anthem. The home must read as finished with it
  // alone: the chant at the top, and nothing empty under it.
  const index = chantIndex();

  it("opens on the one chant there is, and draws no row, chip or list for it", () => {
    expect(index.length).toBeGreaterThanOrEqual(1);
    if (index.length !== 1) return;
    const home = chantsHome(index, day(2026, 10, 16), "new");
    expect(home.featured?.slug).toBe("prayer-rope-anthem");
    expect(home.sections).toEqual([]);
    expect(home.traditions).toEqual([]);
    expect(home.all).toBeNull();
  });
});

describe("what the home offers", () => {
  const pascha = row("christ-is-risen", { when: { windows: [{ paschal: [0, 38] }] }, kind: "troparion", tone: 5, shortest: 60 });
  const nativity = row("thy-nativity", { when: { windows: [{ fixed: ["12-25", "12-31"] }] }, tone: 4 });
  const tone2 = row("tone-two", { tone: 2, addedOn: "2026-09-01" });
  const psalm = row("psalm-103", { kind: "psalm", psalm: 103, traditions: ["russian"] });
  const newest = row("newest", { addedOn: "2026-10-15" });

  it("puts the feast first while it is near, then this week's tone, then the newest", () => {
    // Pascha 2026 is 12 April; the week of 11 October is in the second tone.
    expect(chantsHome([tone2, pascha, newest], day(2026, 4, 12), "new").featured?.slug).toBe("christ-is-risen");
    expect(chantsHome([pascha, tone2, newest], day(2026, 10, 11), "new").featured?.slug).toBe("tone-two");
    expect(chantsHome([pascha, newest], day(2026, 10, 11), "new").featured?.slug).toBe("newest");
  });

  it("offers a feast's chants a week ahead, and on the Old Calendar thirteen days later", () => {
    expect(isDue(nativity.when, day(2026, 12, 18), "new", FEAST_AHEAD_DAYS)).toBe(true);
    expect(isDue(nativity.when, day(2026, 12, 17), "new", FEAST_AHEAD_DAYS)).toBe(false);
    expect(isDue(nativity.when, day(2027, 1, 7), "new")).toBe(false);
    expect(isDue(nativity.when, day(2027, 1, 7), "old")).toBe(true);
    // A span over the new year.
    const theophany: ChantWhen = { windows: [{ fixed: ["12-30", "01-14"] }] };
    expect(isDue(theophany, day(2027, 1, 6), "new")).toBe(true);
    expect(isDue(theophany, day(2026, 12, 31), "new")).toBe(true);
    // Movable feasts move with Pascha, alike on both calendars.
    expect(isDue(pascha.when, day(2026, 5, 20), "old")).toBe(true);
    expect(isDue(pascha.when, day(2026, 5, 21), "old")).toBe(false);
    // A chant for any day is never "the feast".
    expect(isDue({ anytime: true }, day(2026, 4, 12), "new")).toBe(false);
  });

  it("draws a row only when it has a chant the top does not already show", () => {
    const home = chantsHome([pascha, tone2, psalm, newest], day(2026, 4, 12), "new");
    // The feast row would be the featured chant alone: not drawn.
    expect(home.sections.map((s) => s.id)).not.toContain("feast");
    // Bright Week has a tone a day, the first on Pascha: none of these.
    expect(home.sections.map((s) => s.id)).not.toContain("tone");
    expect(home.sections.find((s) => s.id === "psalms")?.rows.map((r) => r.slug)).toEqual(["psalm-103"]);
    // Pascha's troparion is short, and is the featured one, alone in its row.
    expect(home.sections.map((s) => s.id)).not.toContain("short");
  });

  it("names the week's tone with its row", () => {
    const home = chantsHome([newest, tone2, row("tone-two-b", { tone: 2 })], day(2026, 10, 11), "new");
    const tone = home.sections.find((s) => s.id === "tone");
    expect(tone && "tone" in tone ? tone.tone : null).toBe(2);
    expect(tone?.rows.map((r) => r.slug)).toEqual(["tone-two", "tone-two-b"]);
  });

  it("calls a chant short at two minutes or less", () => {
    const home = chantsHome([newest, row("brief", { shortest: SHORT_SECONDS }), row("long", { shortest: SHORT_SECONDS + 1 })], day(2026, 10, 16), "new");
    expect(home.sections.find((s) => s.id === "short")?.rows.map((r) => r.slug)).toEqual(["brief"]);
  });

  it("offers traditions only with two to choose between, and the full list only with two chants", () => {
    expect(chantsHome([newest], day(2026, 10, 16), "new").traditions).toEqual([]);
    expect(chantsHome([newest], day(2026, 10, 16), "new").all).toBeNull();
    const two = chantsHome([newest, psalm], day(2026, 10, 16), "new");
    expect(two.traditions).toEqual(["greek", "russian"]);
    expect(two.all?.map((r) => r.slug)).toEqual(["newest", "psalm-103"]);
  });

  it("filters by tradition, and lists traditions in the browse order", () => {
    const list = [psalm, newest, row("anthem", { traditions: ["contemporary"] })];
    expect(traditionsIn(list)).toEqual(["greek", "russian", "contemporary"]);
    expect(inTradition(list, "russian").map((r) => r.slug)).toEqual(["psalm-103"]);
    expect(inTradition(list, null)).toHaveLength(3);
  });

  it("has nothing to offer with no chants, and says so by drawing nothing", () => {
    expect(chantsHome([], day(2026, 10, 16), "new")).toEqual({ featured: null, sections: [], traditions: [], all: null });
  });
});
