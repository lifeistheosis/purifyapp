import { describe, expect, it } from "vitest";

import { KIT_DARK } from "@/lib/email/theme";

import type { TodayPart } from "../briefToday";
import { moneyWindow, type MoneyOrder } from "../money";
import { moneyChart } from "../moneyChart";
import {
  attention,
  briefEmail,
  briefSubject,
  isQuiet,
  moneyDays,
  scrubLine,
  spanFor,
  workedAndNot,
  type BriefFigures,
  type BriefSpan,
} from "../ownerBrief";
import type { PlusFact } from "../plusHistory";
import { lastWeek } from "../weekly";

/**
 * The owner's brief (docs/plans/owner-desk.md section 3; his yes of
 * 2026-11-13). Its rules, each held here: one screen for yesterday, the week
 * on the weekly day; what needs him first and never a count of what is late;
 * "not read" or "not kept yet", never 0; no reader's name or address; charts
 * drawn in the email in the money chart's colours; a quiet day in one line.
 * Every figure below is made up for the test.
 */

const LINKS = { admin: "https://purifyapp.net/admin" };
const ASSETS = { cross: "https://purifyapp.net/email/cross.png", crossInk: "https://purifyapp.net/email/cross-ink.png" };
const TUESDAY = new Date("2026-11-17T12:30:00Z"); // 7:30 AM in New York
const MONDAY = new Date("2026-11-16T12:30:00Z");

const col = (shop: number, plus: number, box: number, refunds = 0) => ({ shop, plus, box, unnamed: 0, refunds });

function figures(span: BriefSpan, over: Partial<BriefFigures> = {}): BriefFigures {
  return {
    span,
    readers: {
      days: span.days.map((day, i) => ({ day, visitors: 100 + i, views: 700, signups: 2 })),
      visitors: { now: 140, before: 150 },
      views: { now: 900, before: 800 },
      signups: { now: 5, before: 3 },
    },
    plus: { joined: { now: 3, before: 2 }, trials: 1, renewalOff: 1, left: 0, cardFailed: 0, priorKept: true },
    money: {
      days: span.days.map((day) => ({ day, ...col(1000, 499, 0) })),
      total: col(4500, 998, 2900, 500),
      prior: col(3000, 499, 0),
      orders: { now: 2, before: 1 },
      subs: "kept",
      subsFrom: "2026-11-01",
      priorKept: true,
    },
    opened: { saints: [{ label: "St. Xenia", count: 4 }], prayers: [], chapters: [{ label: "John 1", count: 3 }] },
    community: { replies: 6, answered: [{ label: "On the Nativity Fast", count: 4 }], questions: { count: 1, unanswered: 1, top: [] } },
    misses: { total: 5, top: [{ label: "st herman", count: 4 }] },
    errors: { total: 0, top: [] },
    context: [],
    waiting: { messages: 0, refunds: 0, toPost: 0 },
    week: null,
    ...over,
  };
}

const TODAY: TodayPart = { day: "2026-11-17", needs: [], pieces: [], board: null, boardError: null };

describe("the span", () => {
  it("is yesterday against the same day last week, on a daily brief", () => {
    const s = spanFor(TUESDAY, false);
    expect(s).toMatchObject({ kind: "day", start: "2026-11-16", end: "2026-11-16", priorStart: "2026-11-09", priorEnd: "2026-11-09" });
    expect(s.label).toBe("Monday 16 November");
  });

  it("is the seven days to yesterday against the seven before, and on a Monday it is the Monday letter's week", () => {
    const s = spanFor(MONDAY, true);
    const letter = lastWeek(MONDAY);
    expect([s.start, s.end, s.priorStart, s.priorEnd]).toEqual([letter.start, letter.end, letter.priorStart, letter.priorEnd]);
    expect(s.days).toHaveLength(7);
    expect(s.label).toBe("9 to 15 November");
  });
});

describe("money", () => {
  it("is counted by Money's chart's own rules, day for day", () => {
    const now = new Date("2026-11-16T20:00:00Z");
    const orders: MoneyOrder[] = [
      { id: "a", total_cents: 4500, payment_status: "paid", created_at: "2026-11-14T09:00:00Z", paid_at: "2026-11-14T09:01:00Z" },
      { id: "b", total_cents: 2000, payment_status: "refunded", created_at: "2026-11-15T09:00:00Z", paid_at: null },
      { id: "c", total_cents: 9900, payment_status: "paid", created_at: "2026-11-16T09:00:00Z", paid_at: "2026-11-16T10:00:00Z" },
    ];
    const refunds = new Map([["c", 900]]);
    const fact = (over: Partial<PlusFact>): PlusFact => ({
      type: "INITIAL_PURCHASE",
      user_id: "u",
      store: "PLAY_STORE",
      product_id: "purify_plus:monthly",
      environment: "PRODUCTION",
      period_type: "NORMAL",
      price_usd: 4.99,
      takehome: 0.85,
      trial_conversion: null,
      reason: null,
      event_at: "2026-11-15T12:00:00Z",
      expires_at: null,
      ...over,
    });
    const facts = [fact({}), fact({ product_id: "purify_pro:monthly", price_usd: 29, event_at: "2026-11-16T12:00:00Z" }), fact({ type: "CANCELLATION", reason: "CUSTOMER_SUPPORT", price_usd: -4.99, event_at: "2026-11-16T13:00:00Z" })];
    const w = moneyWindow("30d", now);
    const chart = moneyChart({ orders, refunds, plus: { state: "ok", facts, since: "2026-11-01T00:00:00Z" }, w, now });
    const days = ["2026-11-14", "2026-11-15", "2026-11-16"];
    const mine = moneyDays({ orders, refunds, plus: facts, days });
    const first = Date.parse(w.since);
    for (const d of mine) {
      const i = Math.round((Date.parse(`${d.day}T00:00:00Z`) - first) / 86_400_000);
      const { day, ...cols } = d;
      expect(cols, day).toEqual(chart.current[i]);
    }
  });

});

describe("no reader's name or address", () => {
  it("drops a line that holds an address, a phone number, a link or a handle", () => {
    expect(scrubLine("How do you keep the Nativity Fast?")).toBe("How do you keep the Nativity Fast?");
    expect(scrubLine("write me at mary@example.org")).toBeNull();
    expect(scrubLine("call 555 123 4567 tonight")).toBeNull();
    expect(scrubLine("see https://example.com/x")).toBeNull();
    expect(scrubLine("thanks @johnny")).toBeNull();
    expect(scrubLine("a".repeat(120))?.length).toBeLessThanOrEqual(80);
  });
});

describe("what it says on its own", () => {
  it("names what rose and what fell, the largest first", () => {
    const wn = workedAndNot(figures(spanFor(TUESDAY, false)));
    expect(wn.worked).toEqual([
      "Money in: $83.98, up 140% on the same day last week",
      "Shop orders: 2, up 100% on the same day last week",
      "New accounts: 5, up 67% on the same day last week",
      "Plus members joined: 3, up 50% on the same day last week",
    ]);
    expect(wn.not).toEqual(["Visitors: 140, down 7% on the same day last week"]);
    // Before subscriptions were kept, the money is not compared whole: only the shop's.
    const early = figures(spanFor(TUESDAY, false));
    if (typeof early.money !== "string") early.money.priorKept = false;
    const earlyLines = workedAndNot(early).worked;
    expect(earlyLines).toContain("Shop money: $45, up 50% on the same day last week");
    expect(earlyLines.join(" ")).not.toContain("Money in");
  });

  it("gives three things worth his attention, never repeating what waits on him", () => {
    const f = figures(spanFor(MONDAY, true), {
      waiting: { messages: 2, refunds: 1, toPost: 3 },
      errors: { total: 4, top: [{ label: "On the server (/api/x): timeout", count: 3 }] },
    });
    const three = attention(f);
    expect(three).toHaveLength(3);
    expect(three[0]).toBe("A question in Ask a Priest has no answer yet.");
    expect(three[1]).toBe('Readers searched for "st herman" 4 times and found nothing.');
    expect(three.join(" ")).not.toMatch(/refund|Messages|posted/);
  });

  it("calls a day quiet only when every figure was read and came back empty", () => {
    const span = spanFor(TUESDAY, false);
    const empty = figures(span, {
      plus: { joined: { now: 0, before: 0 }, trials: 0, renewalOff: 0, left: 0, cardFailed: 0, priorKept: true },
      money: { days: [{ day: span.end, ...col(0, 0, 0) }], total: col(0, 0, 0), prior: col(0, 0, 0), orders: { now: 0, before: 0 }, subs: "kept", subsFrom: null, priorKept: true },
      community: { replies: 0, answered: [], questions: { count: 0, unanswered: 0, top: [] } },
    });
    expect(isQuiet(empty, TODAY)).toBe(true);
    expect(isQuiet({ ...empty, errors: "not read" }, TODAY)).toBe(false);
    expect(isQuiet(empty, { ...TODAY, needs: [{ text: "Open this month's EIKON Box drop", when: "today" }] })).toBe(false);
    const html = briefEmail(empty, TODAY, LINKS, ASSETS).html;
    expect(html).toContain("A quiet day. Nothing needs you.");
    expect(html).toContain("140 visitors, 5 new accounts, no orders, no change in Plus, nothing new in Community, and no errors.");
    // Said once: the opening names the day, and no label repeats it.
    expect(html).not.toContain(">Yesterday</td>");
    expect(html).not.toContain("Opened most");
    expect(briefSubject(empty, TODAY)).toBe("Monday: a quiet day");
  });
});

describe("the subject", () => {
  it("names what needs him first, and never counts what is late", () => {
    const f = figures(spanFor(TUESDAY, false));
    const today: TodayPart = {
      ...TODAY,
      needs: [
        { text: "The EIKON Box drop: not opened for 2 months", when: null },
        { text: "Call the printer", when: "today" },
      ],
    };
    const subject = briefSubject(f, today);
    expect(subject).toBe("Needs you: the EIKON Box drop, not opened for 2 months, and 1 more · Monday: 140 visitors, 5 new accounts, $83.98 in");
    expect(subject).not.toMatch(/late|overdue/i);
  });

  it("says when a piece goes out, when nothing needs him", () => {
    const today: TodayPart = {
      ...TODAY,
      pieces: [{ ruleKey: "email-weekly:2026-W47", name: "The Sunday email", kind: "weekly", periodKey: "2026-W47", subject: "The week ahead", state: "goes", at: "12 noon", why: null }],
    };
    expect(briefSubject(figures(spanFor(TUESDAY, false)), today)).toMatch(/^The Sunday email goes out at 12 noon · Monday: /);
  });
});

describe("the email", () => {
  const today: TodayPart = {
    ...TODAY,
    needs: [{ text: "Open this month's EIKON Box drop", when: "since Nov 1" }],
    pieces: [
      { ruleKey: "email-weekly:2026-W47", name: "The Sunday email", kind: "weekly", periodKey: "2026-W47", subject: "The week ahead", state: "goes", at: "12 noon", why: null },
      { ruleKey: "email-monthly:2026-12", name: "The monthly note", kind: "monthly", periodKey: "2026-11", subject: null, state: "nothing", at: null, why: "Nothing was added to the library since the last monthly note." },
    ],
    board: { text: "The week of the Entry. This week: the Entry of the Theotokos on Saturday.", week: "2026-W47", sources: ["calendar"], saved: "saved" },
  };

  it("puts today first, with the Hold for what goes out, and the board message waiting for his tap", () => {
    const html = briefEmail(figures(spanFor(TUESDAY, false)), today, LINKS, ASSETS).html;
    const order = [">Yesterday</h1>", ">Needs you</td>", ">Goes out today</td>", ">Readers</td>"].map((h) => html.indexOf(h));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain("goes out at 12 noon New York time unless you hold it.");
    expect(html).toMatch(new RegExp(`href="${LINKS.admin}#tab=calendar"[^>]*>Hold it</a>`));
    expect(html).toContain("a draft waits in Patch notes for your tap.");
    expect(html).toContain("nothing to send today. Nothing was added to the library since the last monthly note.");
  });

  it("never holds or sends from a link: every link only opens the admin", () => {
    const html = briefEmail(figures(spanFor(TUESDAY, false)), today, LINKS, ASSETS).html;
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.includes("/admin"));
    for (const h of hrefs) expect(h).toMatch(/^https:\/\/purifyapp\.net\/admin(#tab=[a-z-]+)?$/);
  });

  it("says not read and not kept yet, never 0, for a figure it does not have, under Could not be read", () => {
    const f = figures(spanFor(TUESDAY, false), { plus: "not kept yet", errors: "not read", opened: "not read", misses: "not kept yet" });
    const html = briefEmail(f, TODAY, LINKS, ASSETS).html;
    expect(html).toContain(">Could not be read</td>");
    expect(html).toMatch(/>Plus members<\/td>\s*<td[^>]*>not kept yet<\/td>/);
    expect(html).toMatch(/>Errors<\/td>\s*<td[^>]*>not read<\/td>/);
    expect(html).toMatch(/>What was opened<\/td>\s*<td[^>]*>not read<\/td>/);
    expect(html).toMatch(/>Searches that found nothing<\/td>\s*<td[^>]*>not kept yet<\/td>/);
    expect(html).not.toMatch(/>Errors<\/td>\s*<td[^>]*>0<\/td>/);
  });

  it("is drawn for mail clients: no script, no SVG, no flex or grid, no em dash, no light rays", () => {
    for (const weekly of [false, true]) {
      const now = weekly ? MONDAY : TUESDAY;
      const { html, subject } = briefEmail(figures(spanFor(now, weekly)), today, LINKS, ASSETS);
      expect(html).not.toMatch(/<script|<svg|display:\s*(flex|grid)|conic-gradient/i);
      expect(`${subject}${html}`).not.toContain("—");
      expect(html).toContain('role="presentation"');
    }
  });

  it("meets the design kit's email rules: labels in sentence case, every link a 44px target on a line of its own", () => {
    const html = briefEmail(figures(spanFor(MONDAY, true)), today, LINKS, ASSETS).html;
    expect(html).not.toMatch(/text-transform:uppercase/);
    const links = [...html.matchAll(/(.{0,30})<a href="https:\/\/purifyapp\.net\/admin[^"]*"[^>]*style="([^"]*)"/g)];
    expect(links.length).toBeGreaterThanOrEqual(4);
    for (const [, before, style] of links) {
      // The kit's link (13px above and below an 18px line) or its quiet button (13px around a 16px line): 44 tall.
      expect(/padding:13px 0;[^"]*line-height:18px/.test(style) || /padding:13px 22px;[^"]*line-height:16px/.test(style), style).toBe(true);
      expect(/<td style="padding:[^"]*">$/.test(before) || /<p style="margin:[^"]*">$/.test(before), before).toBe(true);
    }
  });

  it("draws the week as columns, a chart for each area, and money as one bar in the money chart's colours", () => {
    const week = briefEmail(figures(spanFor(MONDAY, true)), today, LINKS, ASSETS).html;
    expect(week).toContain("Visitors, the last seven days");
    expect(week).toContain("New accounts, the last seven days");
    expect(week).toContain("Money in, the last seven days, in dollars");
    expect(week).toContain(">Worth your attention</td>");
    expect(week).toContain(">What worked</td>");
    expect(week).toContain(">What did not</td>");
    for (const c of [KIT_DARK.shop, KIT_DARK.plus, KIT_DARK.box]) expect(week).toContain(`bgcolor="${c}"`);
    const day = briefEmail(figures(spanFor(TUESDAY, false)), today, LINKS, ASSETS).html;
    expect(day).not.toContain("the last seven days");
    expect(day).toContain(`bgcolor="${KIT_DARK.shop}"`);
    // Each part of money said in words beside its colour.
    expect(day).toMatch(/>Purify Plus<\/td>\s*<td[^>]*>\$9\.98<\/td>/);
  });

  it("says money with its cents in one column, and one figure to a row, so the values stand in line", () => {
    const html = briefEmail(figures(spanFor(TUESDAY, false)), TODAY, LINKS, ASSETS).html;
    expect(html).toMatch(/>Shop, 2 orders<\/td>\s*<td[^>]*>\$45\.00<\/td>/);
    expect(html).toMatch(/>EIKON Box<\/td>\s*<td[^>]*>\$29\.00<\/td>/);
    expect(html).toMatch(/>Joined<\/td>\s*<td[^>]*>3<\/td>/);
    expect(html).toMatch(/>Began a free trial<\/td>\s*<td[^>]*>1<\/td>/);
    expect(html).toMatch(/>Questions asked<\/td>\s*<td[^>]*>1<\/td>/);
    expect(html).toMatch(/>Questions with no answer yet<\/td>\s*<td[^>]*>1<\/td>/);
    // No value carries a second figure after a comma.
    expect(html).not.toMatch(/<td[^>]*font-weight:600;[^>]*>\d[\d,]*, /);
  });

  it("opens with how it went after a release, a drop or a sale", () => {
    const f = figures(spanFor(TUESDAY, false), { context: [{ kind: "release", day: "2026-11-16", line: "Purify 1.9 was published on Monday." }] });
    const html = briefEmail(f, TODAY, LINKS, ASSETS).html;
    expect(html.indexOf(">How it went</td>")).toBeGreaterThan(0);
    expect(html.indexOf(">How it went</td>")).toBeLessThan(html.indexOf(">Readers</td>"));
    expect(html).toContain("That day: 140 visitors, 5 new accounts, 2 shop orders, $83.98 in.");
  });
});
