import { afterEach, beforeEach, describe, expect, it } from "vitest";

import daily from "@/data/calendar/daily-readings.json";
import movable from "@/data/calendar/movable-readings.json";
import official from "@/data/calendar/official-readings.json";
import { localDay } from "@/lib/player/chantAsk";
import {
  READINGS_RULE,
  finishReadingsFlow,
  goToReading,
  hrefOf,
  inRanges,
  leaveReadingsFlow,
  rangesOf,
  startReadingsFlow,
  type FlowItem,
} from "@/lib/readings/flow";

type Ref = { book: string; chapter: number; from: number; to: number; label: string };

function refsIn(node: unknown, out: Ref[] = []): Ref[] {
  if (Array.isArray(node)) node.forEach((n) => refsIn(n, out));
  else if (node && typeof node === "object") {
    const r = node as Partial<Ref>;
    if (typeof r.book === "string" && Number.isInteger(r.chapter) && Number.isInteger(r.from) && typeof r.label === "string") out.push(r as Ref);
    Object.values(node).forEach((n) => refsIn(n, out));
  }
  return out;
}

describe("the verses a reading covers in its chapter", () => {
  it("reads a reference's spans", () => {
    expect(rangesOf("1 Thessalonians 5:9-13, 24-28", 9, 28)).toEqual([
      [9, 13],
      [24, 28],
    ]);
    expect(rangesOf("Luke 13:31-35", 31, 35)).toEqual([[31, 35]]);
    expect(rangesOf("Matthew 11:27", 27, 27)).toEqual([[27, 27]]);
    // On into the next chapter: here, to this chapter's end.
    expect(rangesOf("John 21:15-22:3", 15, 25)).toEqual([[15, Number.MAX_SAFE_INTEGER]]);
    // Nothing it can read: the reference's own first and last verse.
    expect(rangesOf("Psalm 50", 1, 21)).toEqual([[1, 21]]);
    expect(rangesOf("Mark 1:1-8; 2:1", 1, 8)).toEqual([[1, 8]]);
  });

  it("starts every reading the calendar holds at its first verse", () => {
    const refs = [...refsIn(daily), ...refsIn(movable), ...refsIn(official)];
    expect(refs.length).toBeGreaterThan(300);
    const wrong = refs.filter((r) => rangesOf(r.label, r.from, r.to)[0][0] !== r.from).map((r) => r.label);
    expect(wrong).toEqual([]);
  });

  it("says whether a verse is one of them", () => {
    const spans: [number, number][] = [
      [9, 13],
      [24, 28],
    ];
    expect([8, 9, 13, 14, 23, 24, 28, 29].map((v) => inRanges(v, spans))).toEqual([false, true, true, false, false, true, true, false]);
  });
});

describe("the walk through today's readings", () => {
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

  const items: FlowItem[] = [
    { book: "1-thessalonians", chapter: 5, ranges: [[9, 13], [24, 28]], label: "1 Thessalonians 5:9-13, 24-28", kind: "epistle" },
    { book: "luke", chapter: 13, ranges: [[31, 35]], label: "Luke 13:31-35", kind: "gospel" },
  ];

  it("opens each reading at its first verse", () => {
    expect(items.map(hrefOf)).toEqual(["/bible/1-thessalonians/5#v9", "/bible/luke/13#v31"]);
  });

  it("goes on reading by reading, keeps the day when done, and forgets the walk", () => {
    startReadingsFlow(items);
    expect(JSON.parse(session.get("purify:readings.flow")!)).toMatchObject({ at: 0, day: localDay() });
    goToReading(1);
    expect(JSON.parse(session.get("purify:readings.flow")!).at).toBe(1);
    goToReading(9);
    expect(JSON.parse(session.get("purify:readings.flow")!).at).toBe(1);
    finishReadingsFlow();
    expect(session.has("purify:readings.flow")).toBe(false);
    // The day is kept as a prayer rule keeps it, so the streak counts it.
    const dates = JSON.parse(local.get(`purify.prayers.${READINGS_RULE}.dates`)!) as string[];
    expect(dates).toHaveLength(1);
    expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("can be left without keeping the day", () => {
    startReadingsFlow(items);
    leaveReadingsFlow();
    expect(session.has("purify:readings.flow")).toBe(false);
    expect(local.has(`purify.prayers.${READINGS_RULE}.dates`)).toBe(false);
  });
});
