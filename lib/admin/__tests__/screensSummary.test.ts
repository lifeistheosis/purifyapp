import { describe, expect, it } from "vitest";

import { SCREENS } from "@/lib/analytics/screens";

import {
  SCREEN_NAMES,
  TIME_CAP_MS,
  finishViews,
  leaveSentence,
  medianSeconds,
  newViewTally,
  onwardSentence,
  sayTime,
  screenSentences,
  summarizeScreenEvents,
  tallyTab,
  type EventRow,
  type Step,
  type ViewSums,
} from "../screensSummary";

// The Screens view's sums (1.8): page views read into visits, and the
// screens' own counts, said in plain sentences.

const NOW = Date.parse("2026-11-30T12:00:00Z");
const MIN = 60_000;
/** Minutes after noon yesterday, a day before NOW. */
const at = (min: number) => NOW - 24 * 60 * MIN + min * MIN;
const tab = (...xs: [string, number][]): Step[] => xs.map(([path, m]) => ({ path, at: at(m) }));
/** The tracker's ping every 20 seconds while a page stays open. */
const pings = (path: string, from: number, until: number): [string, number][] => {
  const out: [string, number][] = [];
  for (let m = from; m < until; m += 1 / 3) out.push([path, m]);
  return out;
};

const sums = (...tabs: Step[][]): ViewSums => {
  const t = newViewTally();
  for (const s of tabs) tallyTab(t, s, NOW);
  return finishViews(t);
};
const row = (v: ViewSums, screen: string) => v.screens.find((s) => s.screen === screen);

describe("page views into views and visits", () => {
  it("counts the pings while a page stays open as one view, timed to the next screen", () => {
    const v = sums(tab(...pings("/prayers/morning", 0, 1), ["/saints/john-chrysostom", 1], ["/saints/john-chrysostom", 1.34]));
    expect(v.views).toBe(2);
    expect(v.visits).toBe(1);
    expect(row(v, "morning-prayers")).toMatchObject({ views: 1, exits: 0, wentOn: 1, medianSeconds: 60 });
    expect(row(v, "morning-prayers")?.next).toEqual([{ screen: "saint", count: 1 }]);
    // The visit ended on the saint, a day ago: that is where the reader left.
    expect(row(v, "saint")).toMatchObject({ views: 1, exits: 1, wentOn: 0, medianSeconds: null });
    expect(v.exits).toBe(1);
  });

  it("ends a visit after 30 minutes with nothing from the tab", () => {
    const v = sums(tab(["/prayers", 0], ["/bible", 1], ["/calendar", 45]));
    expect(v.visits).toBe(2);
    expect(row(v, "prayers")?.next).toEqual([{ screen: "bible", count: 1 }]);
    // The Bible ended the first visit; nothing carries it on to the calendar.
    expect(row(v, "bible")).toMatchObject({ exits: 1, wentOn: 0 });
    expect(row(v, "calendar")).toMatchObject({ exits: 1 });
    expect(v.exits).toBe(2);
  });

  it("counts a screen opened again after a long quiet as a new visit's view", () => {
    const v = sums(tab(["/", 0], ["/", 50]));
    expect(v.visits).toBe(2);
    expect(row(v, "today")).toMatchObject({ views: 2, exits: 2 });
  });

  it("does not count a visit that may still be going as left", () => {
    const v = sums([
      { path: "/prayers/morning", at: NOW - 12 * MIN },
      { path: "/saints/john-chrysostom", at: NOW - 10 * MIN },
    ]);
    expect(v.exits).toBe(0);
    expect(v.open).toBe(1);
    expect(row(v, "morning-prayers")?.wentOn).toBe(1);
  });

  it("caps the time on a screen at 30 minutes", () => {
    const v = sums(tab(...pings("/prayers/morning", 0, 120), ["/saints/john-chrysostom", 120]));
    expect(row(v, "morning-prayers")?.medianSeconds).toBe(TIME_CAP_MS / 1000);
    expect(v.visits).toBe(1);
  });

  it("goes from one chapter to the next as one screen to itself", () => {
    const v = sums(tab(["/bible/john/3", 0], ["/bible/john/4", 3]));
    expect(row(v, "bible-chapter")).toMatchObject({ views: 2, exits: 1, wentOn: 1, medianSeconds: 180 });
    expect(row(v, "bible-chapter")?.next).toEqual([{ screen: "bible-chapter", count: 1 }]);
  });

  it("adds tabs up, most opened first, with the three most common next screens", () => {
    const v = sums(
      tab(["/", 0], ["/prayers/morning", 1]),
      tab(["/", 0], ["/prayers/morning", 2]),
      tab(["/", 0], ["/bible", 1]),
      tab(["/", 0], ["/calendar", 1]),
      tab(["/", 0], ["/saints", 1]),
    );
    expect(v.screens[0].screen).toBe("today");
    expect(v.screens[0].views).toBe(5);
    expect(v.screens[0].next).toEqual([
      { screen: "morning-prayers", count: 2 },
      { screen: "bible", count: 1 },
      { screen: "saints", count: 1 },
    ]);
    // 60, 60, 60, 60 and 120 seconds.
    expect(v.screens[0].medianSeconds).toBe(60);
    expect(v.medianSeconds).toBe(60);
    expect(v.views).toBe(10);
    expect(v.exits).toBe(5);
  });

  it("takes the middle time", () => {
    expect(medianSeconds([])).toBeNull();
    expect(medianSeconds([1000])).toBe(1);
    expect(medianSeconds([1000, 3000])).toBe(2);
    expect(medianSeconds([5000, 1000, 3000])).toBe(3);
  });
});

describe("the screens' own counts", () => {
  const ev = (name: string, day: string, props: Record<string, unknown>): EventRow => ({ name, ts: `${day}T00:00:00Z`, props });
  const rows: EventRow[] = [
    ev("screen_closed", "2026-11-20", { screen: "saint", open: "1m-5m", platform: "ios" }),
    ev("screen_closed", "2026-11-21", { screen: "saint", open: "10s-1m", platform: "web" }),
    ev("screen_closed", "2026-11-22", { screen: "today", open: "1m-5m", platform: "android" }),
    // Before the window.
    ev("screen_closed", "2026-10-01", { screen: "today", open: "under-10s", platform: "web" }),
    ev("first_open", "2026-11-20", { platform: "ios" }),
    ev("first_open", "2026-11-01", { platform: "web" }),
    // Before the window: counts only toward who could have come back after a month.
    ev("first_open", "2026-10-20", { platform: "web" }),
    ev("came_back", "2026-11-27", { day: 7, platform: "ios" }),
    ev("came_back", "2026-11-02", { day: 1, platform: "web" }),
  ];
  const s = summarizeScreenEvents(rows, new Date(NOW), 30);

  it("adds up the closes in the window, by screen and by how long", () => {
    expect(s.all.closes).toBe(3);
    expect(s.all.closedOn).toEqual([
      { screen: "saint", count: 2 },
      { screen: "today", count: 1 },
    ]);
    expect(s.all.spans).toEqual({ "under-10s": 0, "10s-1m": 1, "1m-5m": 2, "over-5m": 0 });
  });

  it("measures coming back against the first opens that could have", () => {
    expect(s.all.firstOpens).toBe(2);
    expect(s.all.cameBack[1]).toEqual({ count: 1, of: 2 });
    expect(s.all.cameBack[7]).toEqual({ count: 1, of: 2 });
    // 20 November's month is not up by the 30th; 20 October's is.
    expect(s.all.cameBack[30]).toEqual({ count: 0, of: 1 });
  });

  it("splits the apps from the website", () => {
    expect(s.apps.closes).toBe(2);
    expect(s.web.closes).toBe(1);
    expect(s.apps.firstOpens).toBe(1);
    expect(s.apps.cameBack[7]).toEqual({ count: 1, of: 1 });
    expect(s.apps.cameBack[1]).toEqual({ count: 0, of: 1 });
    expect(s.web.cameBack[1]).toEqual({ count: 1, of: 1 });
    expect(s.web.cameBack[30]).toEqual({ count: 0, of: 1 });
  });
});

describe("in plain words", () => {
  const v = sums(
    tab(["/prayers/morning", 0], ["/saints/john-chrysostom", 1]),
    tab(["/prayers/morning", 0], ["/saints/basil-the-great", 1]),
    tab(["/prayers/morning", 0], ["/prayers/evening", 1]),
    tab(["/saints/john-chrysostom", 0]),
  );
  const e = summarizeScreenEvents(
    [
      { name: "screen_closed", ts: "2026-11-20T00:00:00Z", props: { screen: "saint", open: "1m-5m", platform: "ios" } },
      { name: "screen_closed", ts: "2026-11-21T00:00:00Z", props: { screen: "saint", open: "1m-5m", platform: "ios" } },
      { name: "first_open", ts: "2026-11-01T00:00:00Z", props: { platform: "ios" } },
      { name: "first_open", ts: "2026-11-02T00:00:00Z", props: { platform: "ios" } },
      { name: "came_back", ts: "2026-11-09T00:00:00Z", props: { day: 7, platform: "ios" } },
    ],
    new Date(NOW),
    30,
  ).all;

  it("says the window the owner's way", () => {
    expect(screenSentences(v, e, 30)).toEqual([
      "Readers opened 7 screens in 4 visits in the last 30 days.",
      "Most visits end on a saint's page: 3 of 4.",
      "From the morning prayers, the next screen is most often a saint's page (67%).",
      "The app was put away most on a saint's page (2 times), most often after 1 to 5 minutes.",
      "1 of 2 new devices came back a week or more after the first open.",
    ]);
  });

  it("names a leave rate only for a screen opened often enough", () => {
    expect(leaveSentence(v)).toBeNull();
    const many = sums(
      ...Array.from({ length: 40 }, (_, i) => (i < 30 ? tab(["/prayers/learning/first", 0]) : tab(["/prayers/learning/first", 0], ["/prayers", 1]))),
    );
    expect(leaveSentence(many)).toBe(
      "Of the screens opened 30 times or more, readers leave a lesson on prayer most often: 75% of its 40 views end the visit.",
    );
    expect(onwardSentence(sums(tab(["/bible/john/3", 0], ["/bible/john/4", 1])))).toBe(
      "From a Bible chapter, the next screen is most often another one (50%).",
    );
  });

  it("says plainly when nothing happened", () => {
    expect(screenSentences(finishViews(newViewTally()), summarizeScreenEvents([], new Date(NOW), 7).all, 7)).toEqual([
      "No screens were opened this week.",
    ]);
  });

  it("says a time shortly", () => {
    expect(sayTime(45)).toBe("45 s");
    expect(sayTime(130)).toBe("2 min 10 s");
    expect(sayTime(1800)).toBe("30 min");
    expect(sayTime(null)).toBe("");
  });

  it("names every screen once, without an em dash", () => {
    expect(Object.keys(SCREEN_NAMES).sort()).toEqual([...SCREENS].sort());
    const names = Object.values(SCREEN_NAMES);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name.includes(String.fromCharCode(0x2014)), name).toBe(false);
  });
});
