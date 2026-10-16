import { useSyncExternalStore } from "react";

import { localDay } from "@/lib/player/chantAsk";
import { leavePlanSession } from "@/lib/plans/session";
import { markRuleCompletedToday } from "@/lib/prayers/storage";

/**
 * Today's readings in one go (1.7, the owner's "Do all of these" of
 * 2026-10-15): from the Church today list, the day's Epistle opens at its
 * passage, a bar at the foot offers the Gospel next, and "Done" after the
 * last one keeps the day, as a prayer rule does (lib/prayers/storage.ts,
 * the "readings" rule). Each reading opens in its own chapter, so it reads
 * offline and with everything a chapter has.
 *
 * The walk is kept for the session and for its day only: tomorrow's
 * readings are tomorrow's. One walk at a time: starting this one leaves a
 * reading plan's day under way (lib/plans/session.ts), and the reverse.
 */
export type FlowItem = {
  book: string;
  chapter: number;
  /** The verses read in this chapter, as [first, last] spans. */
  ranges: [number, number][];
  label: string;
  kind: "epistle" | "gospel" | "ot";
};

export type ReadingsFlow = { day: string; items: FlowItem[]; at: number };

/** The rule id the day is kept under. */
export const READINGS_RULE = "readings";
const KEY = "purify:readings.flow";
const listeners = new Set<() => void>();
let cache: { raw: string | null; val: ReadingsFlow | null } | null = null;

/**
 * The spans of a reference in its own chapter: "1 Thessalonians 5:9-13,
 * 24-28" gives [[9, 13], [24, 28]]. A reading that runs on into the next
 * chapter ("John 21:15-22:3") reads to this chapter's end here.
 */
export function rangesOf(label: string, from: number, to: number): [number, number][] {
  const colon = label.indexOf(":");
  if (colon < 0) return [[from, to]];
  // A second piece in another chapter ("Mark 1:1-8; 2:1") is that chapter's.
  const tail = label.slice(colon + 1).split(";")[0];
  if (tail.includes(":")) return [[from, Number.MAX_SAFE_INTEGER]];
  const spans: [number, number][] = [];
  for (const part of tail.split(",")) {
    const m = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
    if (!m) return [[from, to]];
    const a = Number(m[1]);
    spans.push([a, m[2] ? Number(m[2]) : a]);
  }
  return spans.length ? spans : [[from, to]];
}

export function hrefOf(item: FlowItem): string {
  return `/bible/${item.book}/${item.chapter}#v${item.ranges[0][0]}`;
}

export function inRanges(verse: number, ranges: [number, number][]): boolean {
  return ranges.some(([a, b]) => verse >= a && verse <= b);
}

function read(): ReadingsFlow | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (cache && cache.raw === raw) return cache.val;
  let val: ReadingsFlow | null = null;
  try {
    const parsed = raw ? (JSON.parse(raw) as ReadingsFlow) : null;
    val = parsed && Array.isArray(parsed.items) && parsed.items.length ? parsed : null;
  } catch {
    val = null;
  }
  cache = { raw, val };
  return val;
}

function write(flow: ReadingsFlow | null): void {
  try {
    if (flow) window.sessionStorage.setItem(KEY, JSON.stringify(flow));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* no session storage: the walk is just not remembered */
  }
  cache = null;
  listeners.forEach((l) => l());
}

export function startReadingsFlow(items: FlowItem[], now: Date = new Date()): void {
  if (!items.length) return;
  leavePlanSession();
  write({ day: localDay(now), items, at: 0 });
}

export function goToReading(at: number): void {
  const flow = read();
  if (flow) write({ ...flow, at: Math.max(0, Math.min(flow.items.length - 1, at)) });
}

/** The last one read: the day is kept, and the walk ends. */
export function finishReadingsFlow(): void {
  markRuleCompletedToday(READINGS_RULE);
  write(null);
}

export function leaveReadingsFlow(): void {
  write(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The walk under way today, or null. */
export function useReadingsFlow(now?: Date): ReadingsFlow | null {
  const flow = useSyncExternalStore(subscribe, read, () => null);
  if (!flow) return null;
  return flow.day === localDay(now ?? new Date()) ? flow : null;
}
