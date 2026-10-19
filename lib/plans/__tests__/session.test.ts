// A reading plan's day as a session (1.7, the owner's note 22): Begin, the
// bar through the day's chapters, Done keeping the day as "Mark as read"
// kept it, and only one walk under way at a time.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { localDay } from "@/lib/player/chantAsk";
import { startReadingsFlow } from "@/lib/readings/flow";

import { getPlan } from "../plans";
import { planDoneKey } from "../progress";
import {
  clearJustFinished,
  currentPlanSession,
  finishPlanSession,
  goToPlanReading,
  hrefOfReading,
  leavePlanSession,
  startPlanSession,
} from "../session";

const local = new Map<string, string>();
const session = new Map<string, string>();
const store = (m: Map<string, string>) => ({
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => void m.set(k, v),
  removeItem: (k: string) => void m.delete(k),
});

beforeEach(() => {
  local.clear();
  session.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: store(local), sessionStorage: store(session), dispatchEvent: () => true },
  });
  Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: class { constructor(public type: string) {} } });
});
afterEach(() => {
  // @ts-expect-error -- the node test environment has no window of its own.
  delete globalThis.window;
});

const psalter = getPlan("psalter")!;
const gospels = getPlan("gospels")!;
const saved = () => JSON.parse(session.get("purify:plans.session") ?? "null");

describe("a day of the plan, begun", () => {
  it("walks a kathisma of eight psalms, one chapter at a time, to Done", () => {
    // Kathisma 2 is Psalms 9 to 16.
    startPlanSession(psalter, 1);
    expect(saved()).toMatchObject({ planId: "psalter", day: 1, at: 0, on: localDay() });
    expect(saved().items.map(hrefOfReading)).toEqual([9, 10, 11, 12, 13, 14, 15, 16].map((n) => `/bible/psalms/${n}`));
    for (let at = 1; at < 8; at += 1) goToPlanReading(at);
    expect(saved().at).toBe(7);
    goToPlanReading(20);
    expect(saved().at).toBe(7);
    expect(finishPlanSession()).toMatchObject({ planId: "psalter", day: 1 });
    expect(session.has("purify:plans.session")).toBe(false);
  });

  it("Done keeps the day in the plan and under its strand, as Mark as read did", () => {
    startPlanSession(gospels, 4);
    finishPlanSession();
    const plans = JSON.parse(local.get("purify:plans") ?? "{}");
    expect(Object.keys(plans.gospels.done)).toEqual(["4"]);
    const strand = JSON.parse(local.get("purify.prayers.day:gospel.dates") ?? "[]") as string[];
    expect(strand).toEqual([plans.gospels.done["4"]]);
    // The plan's page opens on this day's finish, until it has been seen.
    expect(JSON.parse(session.get("purify:plans.justFinished") ?? "null")).toMatchObject({ planId: "gospels", day: 4 });
    clearJustFinished();
    expect(session.has("purify:plans.justFinished")).toBe(false);
  });

  it("the last day of a plan read leaves the plan's badge mark", () => {
    const proverbs = getPlan("proverbs")!;
    local.set("purify:plans", JSON.stringify({ proverbs: { startedOn: "2026-09-01", done: Object.fromEntries(proverbs.days.slice(0, 30).map((_, i) => [String(i), "2026-09-01"])) } }));
    startPlanSession(proverbs, 30);
    finishPlanSession();
    expect(JSON.parse(local.get(`purify.prayers.${planDoneKey("proverbs")}.dates`) ?? "[]")).toHaveLength(1);
  });
});

describe("one walk at a time", () => {
  const reading = { book: "luke", chapter: 13, ranges: [[31, 35]] as [number, number][], label: "Luke 13:31-35", kind: "gospel" as const };

  it("beginning a plan's day leaves today's readings", () => {
    startReadingsFlow([reading]);
    expect(session.has("purify:readings.flow")).toBe(true);
    startPlanSession(gospels, 0);
    expect(session.has("purify:readings.flow")).toBe(false);
  });

  it("and starting today's readings leaves the plan's day", () => {
    startPlanSession(gospels, 0);
    startReadingsFlow([reading]);
    expect(session.has("purify:plans.session")).toBe(false);
  });

  it("a day begun yesterday is not under way today", () => {
    startPlanSession(gospels, 0, new Date(Date.now() - 86_400_000 * 1.2));
    expect(currentPlanSession()).toBeNull();
    leavePlanSession();
    expect(session.has("purify:plans.session")).toBe(false);
  });
});
