// Sunset and sunrise for Candlelight at Vespers (1.9, s2-02): the sums held
// against the almanacs' times for places and days whose answers are known,
// to within a few minutes, and the night the palette follows.

import { describe, expect, it } from "vitest";

import { nightAround, sunEvent } from "@/lib/calendar/sun";

const MIN = 60_000;
/** A moment in Greenwich, to the minute. */
const utc = (iso: string) => Date.parse(`${iso}Z`);
const near = (got: number | null, want: number, minutes = 4) => {
  expect(got).not.toBeNull();
  expect(Math.abs((got as number) - want) / MIN).toBeLessThanOrEqual(minutes);
};

describe("the sun", () => {
  it("rises and sets in London as the almanac says, at midsummer and midwinter", () => {
    const [lat, lng] = [51.5074, -0.1278];
    near(sunEvent(2026, 5, 21, lat, lng, true), utc("2026-06-21T03:43"));
    near(sunEvent(2026, 5, 21, lat, lng, false), utc("2026-06-21T20:21"));
    near(sunEvent(2026, 11, 21, lat, lng, true), utc("2026-12-21T08:04"));
    near(sunEvent(2026, 11, 21, lat, lng, false), utc("2026-12-21T15:53"));
  });

  it("sets after Greenwich's midnight where the evening is far west, on the right day", () => {
    // Los Angeles, midsummer: 20:08 by the clock there, 03:08 the next day in Greenwich.
    near(sunEvent(2026, 5, 21, 34.05, -118.24, false), utc("2026-06-22T03:08"));
    near(sunEvent(2026, 5, 21, 34.05, -118.24, true), utc("2026-06-21T12:42"));
  });

  it("rises before Greenwich's midnight where the morning is far east", () => {
    // Sydney, midsummer there: 05:41 by the clock, 18:41 the day before in Greenwich.
    near(sunEvent(2026, 11, 21, -33.87, 151.22, true), utc("2026-12-20T18:41"));
    near(sunEvent(2026, 11, 21, -33.87, 151.22, false), utc("2026-12-21T09:05"));
  });

  it("does not rise or set in the polar day and night", () => {
    expect(sunEvent(2026, 5, 21, 69.65, 18.96, false)).toBeNull();
    expect(sunEvent(2026, 11, 21, 69.65, 18.96, true)).toBeNull();
  });
});

describe("the night the palette follows", () => {
  // Bucharest on 7 November 2026: sunrise about 07:00 and sunset about 16:58 by its clock (UTC+2).
  const place = [44.43, 26.1] as const;
  const day = { y: 2026, m: 10, d: 7 };
  const offset = -120;

  it("is tonight's, still to come, by day", () => {
    const n = nightAround(utc("2026-11-07T10:00"), day, ...place, offset);
    expect(n.now).toBe(false);
    near(n.start, utc("2026-11-07T14:58"));
    near(n.end, utc("2026-11-08T05:01"));
  });

  it("has begun at sunset, and runs to tomorrow's sunrise", () => {
    const n = nightAround(utc("2026-11-07T18:00"), day, ...place, offset);
    expect(n.now).toBe(true);
    near(n.start, utc("2026-11-07T14:58"));
  });

  it("before sunrise, is the night that began yesterday evening", () => {
    const n = nightAround(utc("2026-11-07T03:30"), day, ...place, offset);
    expect(n.now).toBe(true);
    near(n.start, utc("2026-11-06T14:59"));
    near(n.end, utc("2026-11-07T05:00"));
  });

  it("where the sun does not set, runs from six in the evening to six in the morning by the phone's clock", () => {
    const n = nightAround(utc("2026-06-21T12:00"), { y: 2026, m: 5, d: 21 }, 69.65, 18.96, -120);
    expect(n.start).toBe(utc("2026-06-21T16:00"));
    expect(n.end).toBe(utc("2026-06-22T04:00"));
    expect(n.now).toBe(false);
  });
});
