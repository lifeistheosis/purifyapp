// A reference that wraps between its parts and never inside one.
//
// What a reader would notice if this broke: "1 Thessalonians 5:9-13, 24-" at
// the end of a line and "28" alone on the next, on Today, the Bible tab or
// the calendar. A browser breaks a line after a hyphen when it runs out of
// room; a range of verses is one thing.
//
// Rendered to static markup, as lib/community/__tests__/supporterMark.test.ts
// does: react-dom/server needs no DOM.

import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Reference } from "@/components/bible/Reference";
import { dayReadings } from "@/lib/calendar/orthodox";
import { getMessages } from "@/lib/i18n";

import { localBookNames, referenceIn } from "../books";

const draw = (reference: string) => renderToStaticMarkup(createElement(Reference, null, reference));
const words = (html: string) => html.replace(/<[^>]+>/g, "");
const WHOLE = '<span class="whitespace-nowrap">';

describe("Reference", () => {
  it("keeps each range of verses whole", () => {
    expect(draw("1 Thessalonians 5:9-13, 24-28")).toBe(
      `1 Thessalonians ${WHOLE}5:9-13,</span> ${WHOLE}24-28</span>`,
    );
    expect(draw("Luke 13:31-35")).toBe(`Luke ${WHOLE}13:31-35</span>`);
  });

  it("leaves a reference with no range as plain words", () => {
    expect(draw("John 3:16")).toBe("John 3:16");
    expect(draw("Psalms 23")).toBe("Psalms 23");
  });

  it("lets the words of a book's name wrap, in any language", () => {
    const m = getMessages("el");
    const greek = localBookNames((key: string) => m[key] ?? key);
    const reference = referenceIn("1 Thessalonians 5:9-13, 24-28", "1-thessalonians", greek);
    const html = draw(reference);
    // The name is outside every kept-whole part.
    expect(html.startsWith(`${greek["1-thessalonians"]} ${WHOLE}`)).toBe(true);
    expect(words(html)).toBe(reference);
  });

  it("never changes the words, for any reading the calendar can hand a screen", () => {
    const seen = new Set<string>();
    for (let t = Date.UTC(2026, 9, 1, 12); t <= Date.UTC(2027, 11, 31, 12); t += 86_400_000) {
      for (const official of [true, false]) {
        const day = dayReadings(new Date(t), { official });
        for (const r of [...day.readings, ...day.commemoration]) seen.add(r.label);
      }
    }
    expect(seen.size).toBeGreaterThan(300);
    let ranges = 0;
    for (const label of seen) {
      const html = draw(label);
      expect(words(html), label).toBe(label);
      // No hyphen between two digits is left where a line may break.
      expect(html.replace(/<span class="whitespace-nowrap">[^<]*<\/span>/g, ""), label).not.toMatch(/\d-\d/);
      if (html.includes(WHOLE)) ranges += 1;
    }
    expect(ranges).toBeGreaterThan(200);
  });
});

describe("the screens that draw a reading's reference", () => {
  const root = join(__dirname, "..", "..", "..");
  it("all draw it through Reference", () => {
    for (const [path, times] of [
      // One since 1.7: the Church's day on Today draws every reading through one
      // helper, the readings band's and the rows' under it alike (1.8).
      ["components/today/ChurchTodayRail.tsx", 1],
      // One since 1.7: the day's verse names its book in the reader's language.
      ["components/today/VerseOfDayView.tsx", 1],
      // One since 1.6: the Bible tab draws each reading as a row, in one loop.
      ["components/mobile/BibleAppointedToday.tsx", 1],
      ["components/calendar/CalendarClient.tsx", 2],
      // One since 1.7.1: the calendar on a phone draws the chosen day's
      // readings as rows, in one loop.
      ["components/calendar/PhoneCalendar.tsx", 1],
    ] as const) {
      const source = readFileSync(join(root, path), "utf8");
      const drawn = source.match(/<Reference>\{referenceIn\(/g) ?? [];
      // Today's readings read aloud (1.8) name each track by its reference:
      // words handed to the player, which draws them through Reference
      // (below), not drawn here.
      const titles = source.match(/title: referenceIn\(/g) ?? [];
      const bare = (source.match(/referenceIn\(/g) ?? []).length - drawn.length - titles.length;
      expect(drawn.length, path).toBe(times);
      // Nothing draws a reference that has not been through it.
      expect(bare, path).toBe(0);
    }
  });

  it("draw a track's title through Reference in Now Playing", () => {
    const source = readFileSync(join(root, "components/player/NowPlayingSheet.tsx"), "utf8");
    expect(source).toContain("<Reference>{audio.title}</Reference>");
  });
});
