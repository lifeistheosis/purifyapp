"use client";

import { useEffect } from "react";

import { HourlyGoals } from "../HourlyGoals";
import { ApiLimitsPanel } from "../insights/ApiLimits";
import { GoalsView, type GoalStep, type GoalsData } from "./GoalsView";

/**
 * The Goals page on sample numbers, for app/admin/goals-preview: the drawing
 * he says yes or no to, and the page's states to look at before it reads a
 * real week.
 *
 * EVERY FIGURE HERE IS MADE UP. The repository is public, and his two marks
 * and his real numbers live in the database, typed in by him, never here. The
 * samples are consistent with one another (the number is the members times
 * their worth a week, the days follow from the pace) so the drawing can be
 * read as a real week would be, and they are not his.
 */

export type PreviewState = "full" | "first-weeks" | "reached";

const step = (s: Partial<GoalStep> & Pick<GoalStep, "id" | "name" | "weeklyCents">): GoalStep => ({
  reachedOn: null,
  heldWeeks: 0,
  moreMembers: null,
  byPace: null,
  byFive: null,
  ...s,
});

/** A Monday some way ahead, mid-road: three steps reached, Halfway next. */
const FULL: GoalsData = {
  today: "2027-03-04",
  week: "2027-03-01",
  enoughOn: null,
  weeklyCents: 46_490,
  growth: 0.062,
  paceCents: 1_900,
  paying: { monthly: 180, yearly: 95 },
  carried: { members: 0, weeklyCents: 0 },
  thisWeek: { joined: 19, left: 3 },
  steps: [
    step({ id: "bills", name: "Pays its own bills", weeklyCents: 5_300, reachedOn: "2026-12-14" }),
    step({ id: "tenth", name: "A tenth of the way", weeklyCents: 15_000, reachedOn: "2027-01-18" }),
    step({ id: "quarter", name: "A quarter of the way", weeklyCents: 37_500, reachedOn: "2027-02-22" }),
    step({ id: "half", name: "Halfway", weeklyCents: 75_000, moreMembers: 169, byPace: "2027-06-14", byFive: "2027-05-10" }),
    step({ id: "first", name: "The first mark", weeklyCents: 150_000, moreMembers: 613, byPace: "2028-03-20", byFive: "2027-08-16" }),
    step({ id: "second", name: "The second mark", weeklyCents: 300_000, moreMembers: 1_500, byPace: "2029-09-24", byFive: "2027-11-29" }),
  ],
  justReached: null,
  movers: [
    { id: "readers", value: 1_180, aim: 1_140 },
    { id: "begin", value: 0.034, aim: 0.036 },
    { id: "pay", value: 0.42, aim: 0.4 },
    { id: "leave", value: 0.011, aim: 0.0098 },
  ],
  lever: "leaving",
  standStill: 14,
  releases: [
    { version: "2.0", from: "2027-02-09", to: null, joined: 57, left: 9, leftAMonth: 0.049, trialsPaid: 0.44 },
    { version: "1.9", from: "2026-11-10", to: "2027-02-09", joined: 263, left: 41, leftAMonth: 0.056, trialsPaid: 0.39 },
  ],
  rating: { stars: 4.8, store: "Google Play", held: true },
  refunds: { count: 1, payments: 61, low: true },
  mix: {
    monthlyCents: 35_280,
    yearlyCents: 11_210,
    monthlyShareBefore: 0.71,
    leftMonthly: { left: 13, of: 180 },
    leftYearly: { left: 1, of: 95 },
    renewalOff: 6,
    cardFailed: 2,
    allMonthly: 146,
    allYearly: 242,
  },
  extra: { monthCents: 31_000, orders: 14 },
  marks: [
    { name: "The first mark", weeklyCents: 150_000 },
    { name: "The second mark", weeklyCents: 300_000 },
  ],
  streak: { weeks: 6, best: 9 },
  daysLeft: 4,
  perfectWeeks: 3,
  badges: [
    { id: "first", name: "First member", how: "Your first paying member", earnedOn: "2026-11-11", tier: 1 },
    { id: "hundred", name: "100 members", how: "100 paying at once", earnedOn: "2027-01-09", tier: 2 },
    { id: "perfect", name: "Perfect week", how: "All four quests in one week", earnedOn: "2027-02-07", tier: 3 },
    { id: "streak", name: "Hot streak", how: "Four weeks of growth in a row", earnedOn: "2027-02-14", tier: 3 },
    { id: "record", name: "Record week", how: "Beat your best week", earnedOn: "2027-03-01", tier: 4 },
    { id: "monthly", name: "Monthly first", how: "Monthly is 70% of the number", earnedOn: "2027-02-22", tier: 2 },
    { id: "keeper", name: "Keeper", how: "Under 1% leaving four weeks running", earnedOn: null, tier: 4 },
    { id: "refunds", name: "Clean month", how: "A month with no refunds", earnedOn: null, tier: 3 },
    { id: "five-hundred", name: "500 members", how: "500 paying at once", earnedOn: null, tier: 5 },
  ],
  records: [
    { name: "Best week", value: 46_490, unit: "money", on: "2027-03-01", isNew: true },
    { name: "Most joined in a week", value: 24, unit: "count", on: "2027-02-08", isNew: false },
    { name: "Longest streak", value: 9, unit: "weeks", on: "2027-01-18", isNew: false },
    { name: "Fewest leaving in a month", value: 0.038, unit: "share", on: "2027-01-31", isNew: false },
  ],
};

/** The first fortnight after the events began: no rate, no day, no aims, said plainly. */
const FIRST_WEEKS: GoalsData = {
  ...FULL,
  today: "2026-11-24",
  week: "2026-11-23",
  enoughOn: "2026-12-14",
  weeklyCents: 20_164,
  growth: null,
  paceCents: null,
  paying: { monthly: 80, yearly: 38 },
  carried: { members: 0, weeklyCents: 0 },
  thisWeek: { joined: 4, left: 1 },
  steps: [
    step({ id: "bills", name: "Pays its own bills", weeklyCents: 5_300, heldWeeks: 1, byPace: "2026-12-14" }),
    step({ id: "tenth", name: "A tenth of the way", weeklyCents: 15_000, heldWeeks: 1, byPace: "2026-12-14" }),
    step({ id: "quarter", name: "A quarter of the way", weeklyCents: 37_500, moreMembers: 102 }),
    step({ id: "half", name: "Halfway", weeklyCents: 75_000, moreMembers: 321 }),
    step({ id: "first", name: "The first mark", weeklyCents: 150_000, moreMembers: 760 }),
    step({ id: "second", name: "The second mark", weeklyCents: 300_000, moreMembers: 1_638 }),
  ],
  movers: null,
  lever: null,
  standStill: null,
  releases: [{ version: "1.9", from: "2026-11-10", to: null, joined: 6, left: 1, leftAMonth: null, trialsPaid: null }],
  refunds: { count: 0, payments: 9, low: true },
  mix: {
    monthlyCents: 15_680,
    yearlyCents: 4_484,
    monthlyShareBefore: null,
    leftMonthly: null,
    leftYearly: null,
    renewalOff: 1,
    cardFailed: 0,
    allMonthly: null,
    allYearly: null,
  },
  extra: { monthCents: 4_800, orders: 2 },
  streak: { weeks: 0, best: 0 },
  daysLeft: 6,
  perfectWeeks: 0,
  badges: FULL.badges.map((b) => (b.id === "first" ? b : { ...b, earnedOn: null })),
  records: [
    { name: "Best week", value: 20_164, unit: "money", on: "2026-11-23", isNew: true },
    { name: "Most joined in a week", value: 5, unit: "count", on: "2026-11-16", isNew: false },
  ],
};

/** The Monday a step is reached: its moment at the head. */
const REACHED: GoalsData = {
  ...FULL,
  steps: FULL.steps.map((s) => (s.id === "quarter" ? { ...s, reachedOn: "2027-03-01" } : s)),
  justReached: "quarter",
};

const DATA: Record<PreviewState, GoalsData> = { full: FULL, "first-weeks": FIRST_WEEKS, reached: REACHED };

export function GoalsPreview({ state, theme }: { state: PreviewState; theme: "dark" | "light" }) {
  // The panel's two themes, and the gate's palettes worn over them: checkMock
  // (scripts/mock-check.mjs) puts the reader's palettes on <html> as
  // data-reading-mode, which this panel does not read, so here its Light
  // (parchment) wears the panel's light and every other palette its dark.
  // Nowhere but this preview.
  useEffect(() => {
    const h = document.documentElement;
    const wear = () => {
      const mode = h.getAttribute("data-reading-mode");
      h.setAttribute("data-adm-theme", mode === null ? theme : mode === "parchment" ? "light" : "dark");
    };
    wear();
    const watch = new MutationObserver(wear);
    watch.observe(h, { attributes: true, attributeFilter: ["data-reading-mode"] });
    return () => watch.disconnect();
  }, [theme]);

  return (
    <div className="adm adm-page min-h-[100dvh]" style={{ background: "var(--adm-bg)", color: "var(--adm-ink)" }}>
      <main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-6" data-goals-preview>
        <GoalsView data={DATA[state]} hourly={<HourlyGoals />} licence={<ApiLimitsPanel />} onSaveMarks={() => undefined} />
      </main>
    </div>
  );
}
