// The Desert Fathers saying shown on the days the saint of the day has no
// profile to open, which the audit measured at 305 days of 365 in 2026.
//
// Two things matter here and neither is cosmetic. The choice must be stable
// for a whole day, because a quotation that changes under the reader while
// they are looking at it is a bug they cannot report. And every saying must
// carry its own attribution, because the card renders directly beneath the
// day's commemoration and an unattributed line there would read as that
// saint's words.

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { TodaySayingCard } from "@/components/today/TodaySayingCard";
import { getMessages } from "@/lib/i18n";
import { litSpan } from "@/lib/share/verseCard";
import { SAINT_FACES } from "@/lib/today/saintFaces";
import { allSayings, sayingForDay, sayingQuote } from "@/lib/today/saying";

/** A date at UTC noon, the frame the calendar helpers use. */
function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12));
}

describe("the sayings corpus", () => {
  it("is not empty", () => {
    expect(allSayings().length).toBeGreaterThan(0);
  });

  it("attributes every saying", () => {
    // The card sits under the day's commemoration. An unattributed line there
    // would read as the commemorated saint's words.
    for (const s of allSayings()) {
      expect(s.attribution?.trim(), JSON.stringify(s)).toBeTruthy();
      expect(s.text?.trim(), JSON.stringify(s)).toBeTruthy();
    }
  });

  it("carries no em dash, which is a standing rule for reader-facing copy", () => {
    for (const s of allSayings()) {
      expect(s.text.includes("—"), s.attribution).toBe(false);
      expect(s.attribution.includes("—"), s.attribution).toBe(false);
    }
  });
});

describe("sayingForDay", () => {
  it("returns the same saying all day", () => {
    // Same calendar day, different clock times.
    const morning = new Date(Date.UTC(2026, 7, 9, 6));
    const night = new Date(Date.UTC(2026, 7, 9, 23));
    expect(sayingForDay(morning)).toEqual(sayingForDay(night));
  });

  it("changes from one day to the next", () => {
    // The corpus header asks for this explicitly: the same line must not
    // appear two days running.
    for (let d = 1; d <= 20; d += 1) {
      const a = sayingForDay(utc(2026, 3, d));
      const b = sayingForDay(utc(2026, 3, d + 1));
      expect(a, `day ${d}`).not.toEqual(b);
    }
  });

  it("never returns nothing while the corpus has entries", () => {
    for (let d = 0; d < 400; d += 1) {
      const day = new Date(Date.UTC(2026, 0, 1 + d, 12));
      expect(sayingForDay(day), day.toISOString()).not.toBeNull();
    }
  });

  it("uses the whole corpus across a year rather than a favourite few", () => {
    const seen = new Set<string>();
    for (let d = 0; d < 365; d += 1) {
      const s = sayingForDay(new Date(Date.UTC(2026, 0, 1 + d, 12)));
      if (s) seen.add(s.text);
    }
    expect(seen.size).toBe(allSayings().length);
  });

  it("is stable across years for the same day of year", () => {
    // Determinism, not novelty: the point is that it cannot flicker, and a
    // reader comparing two devices sees the same line.
    expect(sayingForDay(utc(2026, 5, 14))).toEqual(sayingForDay(utc(2027, 5, 14)));
  });
});

// Share as a picture (1.8, round 3 r3-11 found the saying, the quote Today
// shows on most days, was the one that could not be shared).
describe("the saying as a picture", () => {
  type ProviderProps = Parameters<typeof MessagesProvider>[0];
  const en = getMessages("en");
  const draw = (node: React.ReactElement) => renderToString(createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, node));

  it("lights a whole word only where one plainly carries the saying, as the sheets lit them", () => {
    const lit = allSayings().filter((s) => s.lit);
    for (const s of lit) expect(litSpan(s.text, s.lit), `${s.attribution}: ${s.lit}`).not.toBeNull();
    expect(lit.map((s) => s.lit)).toEqual(["daily", "discretion", "humility"]);
  });

  it("names St Antony's page for his sayings, where his cover is his face, and no page for the Abbas who have none", () => {
    for (const s of allSayings()) {
      if (/Antony/.test(s.attribution)) expect(s.speaker, s.text).toBe("anthony-the-great");
      else expect(s.speaker, s.text).toBeUndefined();
      if (s.speaker) expect(s.speaker in SAINT_FACES, s.speaker).toBe(true);
    }
  });

  it("is the Father named on it, the work that keeps his words and their place, under From the Desert Fathers", () => {
    const moses = allSayings().find((s) => s.text.startsWith("True discretion"))!;
    expect(sayingQuote(moses, { head: "From the Desert Fathers", face: null, lang: "en" })).toEqual({
      name: "Abba Moses",
      head: "From the Desert Fathers",
      byline: "St. John Cassian, The Conferences",
      source: "Conference 2, Chapter 10",
      pageHead: "From the Desert Fathers",
      pageSource: "St. John Cassian, The Conferences, Conference 2, Chapter 10",
      ring: "Abba Moses · From the Desert Fathers",
      lit: "humility",
      face: null,
      lang: "en",
    });
  });

  it("offers Share as a picture on the card, and keeps the source line", () => {
    const html = draw(createElement(TodaySayingCard, { saying: allSayings()[0] }));
    expect(html).toMatch(/<button(?=[^>]*data-saying-share="")(?=[^>]*aria-label="Share as a picture")/);
    expect(html).toContain('data-cite="father"');
    expect(html).toContain("St. Antony the Great");
  });
});
