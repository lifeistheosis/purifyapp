// The Monday email (admin item A8): the week it covers, and the words.

import { describe, expect, it } from "vitest";

import { change, isLetterDay, lastWeek, letterHtml, letterSubject, usd, type WeekFigures } from "../weekly";

const FULL: WeekFigures = {
  visitors: { now: 4210, before: 3800 },
  views: { now: 80_000, before: 80_000 },
  signups: { now: 252, before: 0 },
  shop: { cents: { now: 9488, before: 0 }, orders: { now: 1, before: 0 } },
  plus: { paidCents: { now: 12_050, before: 10_000 }, paying: 16, trials: 3, mrrCents: 19_984, source: "revenuecat" },
  locks: { top: [{ name: "Word study", taps: 40, bought: 2 }, { name: "Your journal", taps: 12, bought: 0 }], taps: 52, bought: 2 },
  waiting: { messages: 2, refunds: 0, toPost: 1 },
};

describe("the week", () => {
  it("is the last whole Monday to Sunday in UTC before a Monday", () => {
    // Monday 9 November 2026, 13:00 UTC.
    expect(lastWeek(new Date("2026-11-09T13:00:00Z"))).toEqual({
      start: "2026-11-02",
      end: "2026-11-08",
      next: "2026-11-09",
      priorStart: "2026-10-26",
      priorEnd: "2026-11-01",
      label: "2 to 8 November",
    });
  });

  it("is the same week from any day of the week after it", () => {
    expect(lastWeek(new Date("2026-11-15T23:59:00Z")).start).toBe("2026-11-02");
    expect(lastWeek(new Date("2026-11-10T00:00:00Z")).start).toBe("2026-11-02");
  });

  it("names both months when the week crosses one", () => {
    expect(lastWeek(new Date("2026-11-02T13:00:00Z")).label).toBe("26 October to 1 November");
  });

  it("goes on Mondays only", () => {
    expect(isLetterDay(new Date("2026-11-09T13:00:00Z"))).toBe(true);
    expect(isLetterDay(new Date("2026-11-10T13:00:00Z"))).toBe(false);
    // Sunday evening in the Americas is already Monday in UTC, and that is the day it keys on.
    expect(isLetterDay(new Date("2026-11-09T00:30:00Z"))).toBe(true);
  });
});

describe("the words", () => {
  it("says the change against the week before plainly", () => {
    expect(change({ now: 110, before: 100 })).toBe("up 10% on the week before");
    expect(change({ now: 90, before: 100 })).toBe("down 10% on the week before");
    expect(change({ now: 100, before: 100 })).toBe("the same as the week before");
    expect(change({ now: 5, before: 0 })).toBe("none the week before");
    expect(change({ now: 0, before: 0 })).toBe("none the week before either");
    expect(change({ now: 1001, before: 1000 })).toBe("a little up on the week before");
  });

  it("writes dollars as a person would", () => {
    expect(usd(9488)).toBe("$94.88");
    expect(usd(120_000)).toBe("$1,200");
    expect(usd(-500)).toBe("-$5");
  });

  it("puts the week and its two headline counts in the subject", () => {
    const w = lastWeek(new Date("2026-11-09T13:00:00Z"));
    expect(letterSubject(w, FULL)).toBe("Your week, 2 to 8 November: 4,210 visits, 252 new accounts");
    expect(letterSubject(w, { ...FULL, visitors: null, signups: null })).toBe("Your week, 2 to 8 November");
  });

  it("carries every section, and the admin's address", () => {
    const html = letterHtml(lastWeek(new Date("2026-11-09T13:00:00Z")), FULL, "https://purifyapp.net/admin");
    for (const text of ["Readers", "Money", "What sold Plus", "Waiting on you", "4,210", "$94.88", "$120.50", "Word study", "2 open messages", "1 to post"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('href="https://purifyapp.net/admin"');
  });

  it("says not read for a figure that could not be read, never zero", () => {
    const html = letterHtml(
      lastWeek(new Date("2026-11-09T13:00:00Z")),
      { visitors: null, views: null, signups: null, shop: null, plus: null, locks: null, waiting: { messages: null, refunds: null, toPost: null } },
      "https://purifyapp.net/admin",
    );
    expect(html).toContain("not read");
    expect(html).not.toMatch(/>0</);
  });

  it("says Plus is not counted without RevenueCat, and that the run rate is an estimate", () => {
    const html = letterHtml(
      lastWeek(new Date("2026-11-09T13:00:00Z")),
      { ...FULL, plus: { paidCents: null, paying: 16, trials: null, mrrCents: 19_984, source: "estimate" } },
      "https://purifyapp.net/admin",
    );
    expect(html).toContain("RevenueCat is not connected");
    expect(html).toContain("estimated at list price");
  });

  it("escapes what it prints", () => {
    const html = letterHtml(
      lastWeek(new Date("2026-11-09T13:00:00Z")),
      { ...FULL, locks: { top: [{ name: "<b>x</b> & y", taps: 1, bought: 0 }], taps: 1, bought: 0 } },
      "https://purifyapp.net/admin?a=1&b=2",
    );
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt; &amp; y");
    expect(html).toContain('href="https://purifyapp.net/admin?a=1&amp;b=2"');
  });

  it("uses no em dash", () => {
    const html = letterHtml(lastWeek(new Date("2026-11-09T13:00:00Z")), FULL, "https://purifyapp.net/admin");
    expect(html).not.toContain(String.fromCharCode(0x2014));
  });
});
