import { describe, expect, it } from "vitest";

import { orthodoxPascha } from "@/lib/calendar/pascha";
import { chantIndex } from "@/lib/chants/registry.server";
import { FEAST_AHEAD_DAYS, SHORT_SECONDS, chantsHome, inTradition, isDue, restingChant, traditionsIn } from "@/lib/chants/select";
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
  // 1.8: the Prayer Rope Anthem, the one chant with a cover, and since the
  // owner's "Add all 6 now" of 2026-10-30 Psalm 117, Psalm 135 and the
  // Paschal Canon, with none. The coordinator's walk of 2026-10-30 found the
  // home opening on Psalm 117's empty square: the top is a chant with a
  // cover, except the Paschal Canon in its own season.
  const index = chantIndex();
  const pascha2027 = orthodoxPascha(2027);
  const fromPascha = (days: number) => new Date(pascha2027.getTime() + days * 86_400_000);

  it("opens on the chant with a cover out of season, and draws no row with nothing in it", () => {
    const home = chantsHome(index, day(2026, 10, 30), "new");
    expect(home.featured?.slug).toBe("prayer-rope-anthem");
    expect(home.featured?.cover).toBeDefined();
    expect(restingChant(index)?.slug).toBe("prayer-rope-anthem");
    for (const s of home.sections) expect(s.rows.length, s.id).toBeGreaterThan(0);
    expect(home.sections.find((s) => s.id === "psalms")?.rows.map((r) => r.slug)).toEqual(["psalm-117", "psalm-135"]);
    expect(home.all?.length).toBe(index.length);
  });

  it("opens on the Paschal Canon from Palm Sunday through Bright Week, and on the Anthem either side", () => {
    for (const d of [-7, 0, 6]) expect(chantsHome(index, fromPascha(d), "new").featured?.slug, `Pascha ${d}`).toBe("paschal-canon");
    for (const d of [-8, 7]) expect(chantsHome(index, fromPascha(d), "new").featured?.slug, `Pascha ${d}`).toBe("prayer-rope-anthem");
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

  it("opens out of season on a chant with a cover, the newest of them, before any without (1.8)", () => {
    const cover = { src: "/audio/art/anthem.jpg", alt: "an icon", credit: "public domain" };
    const older = row("older-with-cover", { addedOn: "2026-09-01", cover });
    // The newest has no cover, so the top is the newest that has one.
    expect(chantsHome([older, newest, tone2], day(2026, 10, 16), "new").featured?.slug).toBe("older-with-cover");
    expect(restingChant([older, newest])?.slug).toBe("older-with-cover");
    // This week's tone with a cover comes before it; without one, after it.
    expect(chantsHome([older, newest, row("tone-two-covered", { tone: 2, cover })], day(2026, 10, 11), "new").featured?.slug).toBe("tone-two-covered");
    expect(chantsHome([older, newest, tone2], day(2026, 10, 11), "new").featured?.slug).toBe("older-with-cover");
    // In its own season the feast's chant opens the home, with a cover or without.
    expect(chantsHome([older, newest, pascha], day(2026, 4, 12), "new").featured?.slug).toBe("christ-is-risen");
    expect(restingChant([])).toBeNull();
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
