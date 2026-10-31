import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { encodeRail, pickedRail, type ViewUse } from "../rail";
import {
  applySuggestion,
  durationWords,
  homeLine,
  homeWasDoorway,
  railFromCookies,
  railSuggestions,
  stillAsked,
  timeByPage,
  weekSentence,
} from "../yourWeek";

/**
 * Your week, his pick B for the Audit log on r3-17 (2026-10-30): his use in
 * sentences, suggestions answered Do it or Not now, and the rail moving only
 * on his yes. Every count below is made up.
 */

const v = (tab: string, opens: number, quickExits: number, totalMs: number): ViewUse => ({ tab, opens, quickExits, totalMs });

// A week like the sheet's: Traffic and Money read, Home a doorway, Orders
// opened more than Users.
const WEEK: ViewUse[] = [
  v("traffic", 31, 2, 9 * 60_000),
  v("overview", 24, 3, 5 * 60_000),
  v("orders", 18, 1, 4 * 60_000),
  v("users", 4, 2, 30_000),
  v("today", 33, 30, 60_000),
  v("messages", 5, 0, 40_000),
  v("drop", 6, 0, 3 * 60_000),
];

const ids = (groups: ReturnType<typeof pickedRail>) => groups.map((g) => g.pages.map((p) => p.id));

describe("your week in words", () => {
  it("sums each page's views and puts the most time first", () => {
    const pages = timeByPage([...WEEK, v("revenue", 2, 0, 60_000)]);
    expect(pages[0]).toMatchObject({ pageId: "traffic", label: "Traffic", visits: 31 });
    // Money's two views, Overview and Revenue, are one page.
    expect(pages.find((p) => p.pageId === "overview")).toMatchObject({ label: "Money", visits: 26, ms: 6 * 60_000 });
  });

  it("says what he read and what Home was", () => {
    const pages = timeByPage(WEEK);
    expect(weekSentence(pages, 7)).toBe("This week you read Traffic and Money. Home was a doorway.");
    expect(weekSentence(pages, 30)).toBe("These 30 days you read Traffic and Money. Home was a doorway.");
    expect(weekSentence([], 7)).toBe("This week the log holds no visits of yours.");
    expect(homeWasDoorway(pages.find((p) => p.pageId === "today"))).toBe(true);
  });

  it("says where Home's visits went", () => {
    const pages = timeByPage(WEEK);
    expect(homeLine(pages, [{ from: "today", to: "overview", count: 19 }, { from: "today", to: "traffic", count: 8 }, { from: "traffic", to: "overview", count: 9 }])).toBe(
      "Home: 33 visits, 30 of them left within five seconds, most for Money.",
    );
  });

  it("rounds time the way a person reads it", () => {
    expect(durationWords(40_000)).toBe("40 s");
    expect(durationWords(9 * 60_000)).toBe("9 min");
    expect(durationWords(65 * 60_000)).toBe("1 h 5 min");
  });
});

describe("suggestions, and the rail on his yes", () => {
  it("suggests nothing from a thin week", () => {
    expect(railSuggestions(pickedRail(), [v("traffic", 3, 0, 60_000)], 7)).toEqual([]);
  });

  it("suggests the moves his use makes, the one into Daily first", () => {
    const s = railSuggestions(pickedRail(), WEEK, 7);
    // Users had half a minute all week: it steps down for Orders and, with
    // under a minute, folds into Tools, the rail's own rule.
    expect(s.map((x) => x.title)).toEqual(["Put Orders in Daily.", "Bring Releases out of Tools.", "Fold Users into Tools."]);
    expect(s[0].why).toBe("You opened it 18 times this week, 4 min in all.");
    expect(s[0].id).toBe("orders>Daily");
    expect(s[2].why).toBe("You opened it 4 times this week, 30 s in all.");
  });

  it("moves one page on Do it, and the Daily page used least steps down", () => {
    const [orders] = railSuggestions(pickedRail(), WEEK, 7);
    const next = applySuggestion(pickedRail(), orders, WEEK);
    expect(ids(next)[0]).toEqual(["today", "traffic", "overview", "orders"]);
    expect(ids(next)[1][0]).toBe("users");
    // Every page still in exactly one place.
    const all = ids(next).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(ids(pickedRail()).flat().length);
  });

  it("reads the rail the server drew back from the cookie", () => {
    const [orders] = railSuggestions(pickedRail(), WEEK, 7);
    const value = encodeRail(applySuggestion(pickedRail(), orders, WEEK), "20261030");
    expect(ids(railFromCookies(`other=1; adm_rail=${value}; x=y`))[0]).toEqual(["today", "traffic", "overview", "orders"]);
    expect(ids(railFromCookies(""))).toEqual(ids(pickedRail()));
  });

  it("keeps a suggestion answered Not now away for a week", () => {
    const s = railSuggestions(pickedRail(), WEEK, 7);
    const now = Date.parse("2026-10-30T12:00:00Z");
    expect(stillAsked(s, { "orders>Daily": "2026-10-28T12:00:00Z" }, now).map((x) => x.id)).toEqual(["drop>When needed", "users>Tools"]);
    expect(stillAsked(s, { "orders>Daily": "2026-10-20T12:00:00Z" }, now)).toHaveLength(3);
  });

  it("leaves the rail to his yes: the shell no longer writes it, Your week does", () => {
    const shell = readFileSync(join(process.cwd(), "components/admin/AdminShell.tsx"), "utf8");
    const week = readFileSync(join(process.cwd(), "components/admin/tabs/UsageTab.tsx"), "utf8");
    expect(shell).not.toContain("railCookie(");
    expect(shell).not.toContain("railFromUsage(");
    expect(week).toContain("document.cookie = railCookie(");
  });
});
