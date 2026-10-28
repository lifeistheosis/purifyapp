import { describe, expect, it } from "vitest";

import { COUNT_PLATFORMS } from "@/lib/onboarding/counting";
import { trackEventSchema } from "@/lib/security/schemas";

import {
  CAME_BACK_DAYS,
  OPEN_SPANS,
  SCREEN_EVENTS,
  cameBackDue,
  isScreenEvent,
  openSpan,
  parseVisitRecord,
  screenEventBody,
  type VisitRecord,
} from "../screenCounting";
import { SCREENS } from "../screens";

// The screens' counts (1.8): totals with no reader in them. These hold the
// rules the totals depend on, and that the server takes nothing off the lists.

const record = (over: Partial<VisitRecord> = {}): VisitRecord => ({ at: "2026-11-08", sent: [], ...over });

describe("the screens' counts", () => {
  it("puts how long a screen showed into four spans", () => {
    expect(openSpan(0)).toBe("under-10s");
    expect(openSpan(9_999)).toBe("under-10s");
    expect(openSpan(10_000)).toBe("10s-1m");
    expect(openSpan(59_999)).toBe("10s-1m");
    expect(openSpan(60_000)).toBe("1m-5m");
    expect(openSpan(299_999)).toBe("1m-5m");
    expect(openSpan(300_000)).toBe("over-5m");
    expect(openSpan(86_400_000)).toBe("over-5m");
    // A clock that went backwards, or nothing at all, is the shortest span.
    expect(openSpan(-5)).toBe("under-10s");
    expect(openSpan(Number.NaN)).toBe("under-10s");
  });

  it("counts coming back once for each day reached, and never twice", () => {
    expect(cameBackDue(record(), "2026-11-08")).toEqual([]);
    expect(cameBackDue(record(), "2026-11-09")).toEqual([1]);
    // First back on day 9: day 1 and day 7 at once.
    expect(cameBackDue(record(), "2026-11-17")).toEqual([1, 7]);
    expect(cameBackDue(record({ sent: [1] }), "2026-11-17")).toEqual([7]);
    expect(cameBackDue(record({ sent: [1, 7] }), "2026-12-08")).toEqual([30]);
    expect(cameBackDue(record({ sent: [1, 7, 30] }), "2027-03-01")).toEqual([]);
  });

  it("counts nothing for a device that had used Purify before", () => {
    expect(cameBackDue(record({ before: true }), "2026-12-08")).toEqual([]);
  });

  it("reads back only a record it wrote", () => {
    expect(parseVisitRecord(null)).toBeNull();
    expect(parseVisitRecord("not json")).toBeNull();
    expect(parseVisitRecord("null")).toBeNull();
    expect(parseVisitRecord(JSON.stringify({ at: "yesterday", sent: [] }))).toBeNull();
    expect(parseVisitRecord(JSON.stringify({ at: "2026-11-08", sent: [1, 2, "7", 30] }))).toEqual({ at: "2026-11-08", sent: [1, 30] });
    expect(parseVisitRecord(JSON.stringify({ at: "2026-11-08", before: true }))).toEqual({ at: "2026-11-08", sent: [], before: true });
    // Nothing else rides along: a stray field is dropped, not kept.
    expect(parseVisitRecord(JSON.stringify({ at: "2026-11-08", sent: [], who: "reader@example.com" }))).toEqual({ at: "2026-11-08", sent: [] });
  });

  it("knows its own event names", () => {
    for (const name of SCREEN_EVENTS) expect(isScreenEvent(name)).toBe(true);
    expect(isScreenEvent("onboarding_returned")).toBe(false);
  });
});

describe("what the device sends is what the server takes", () => {
  const parse = (body: string) => trackEventSchema.safeParse(JSON.parse(body));

  it("a close on every screen, after every span, from every kind of device", () => {
    for (const platform of COUNT_PLATFORMS) {
      for (const screen of SCREENS) {
        for (const open of OPEN_SPANS) {
          expect(parse(screenEventBody({ name: "screen_closed", props: { screen, open } }, platform)).success, `${screen} ${open}`).toBe(true);
        }
      }
    }
  });

  it("a first open and every return", () => {
    for (const platform of COUNT_PLATFORMS) {
      expect(parse(screenEventBody({ name: "first_open", props: {} }, platform)).success).toBe(true);
      for (const day of CAME_BACK_DAYS) expect(parse(screenEventBody({ name: "came_back", props: { day } }, platform)).success).toBe(true);
    }
  });

  it("sends nothing but the event and the kind of device", () => {
    expect(JSON.parse(screenEventBody({ name: "screen_closed", props: { screen: "saint", open: "1m-5m" } }, "ios"))).toEqual({
      name: "screen_closed",
      props: { screen: "saint", open: "1m-5m", platform: "ios" },
    });
  });
});

describe("the server takes only what is on the lists", () => {
  const take = (name: string, props: Record<string, unknown>) => trackEventSchema.safeParse({ name, props }).success;

  it("takes the days on the list and no other", () => {
    for (const day of CAME_BACK_DAYS) expect(take("came_back", { day, platform: "web" })).toBe(true);
    for (const day of [0, 2, 14, 31]) expect(take("came_back", { day, platform: "web" })).toBe(false);
  });

  it("refuses an address, a span or a device it does not know", () => {
    expect(take("screen_closed", { screen: "/saints/john-chrysostom", open: "1m-5m", platform: "web" })).toBe(false);
    expect(take("screen_closed", { screen: "saint", open: "an hour", platform: "web" })).toBe(false);
    expect(take("screen_closed", { screen: "saint", open: "1m-5m", platform: "linux" })).toBe(false);
    expect(take("screen_closed", { screen: "saint", open: "1m-5m" })).toBe(false);
  });

  it("refuses anything that could name a reader", () => {
    expect(take("screen_closed", { screen: "saint", open: "1m-5m", platform: "web", sessionId: "abc123abc123abc123" })).toBe(false);
    expect(take("first_open", { platform: "android", device: "f2b1c0d4" })).toBe(false);
    expect(take("came_back", { day: 7, platform: "ios", firstOpen: "2026-11-01" })).toBe(false);
  });
});
