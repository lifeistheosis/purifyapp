"use client";

import { useSyncExternalStore } from "react";

import { CHART_RANGES, type ChartRange } from "./trafficChart";

/**
 * How many days Traffic's chart shows, remembered per browser.
 *
 * His log of 2 to 4 November 2026: the chart forgot the range on every visit
 * (it started at 30 each time), and he picked it again in 5 of the 6 visits
 * that reached Traffic. Now / Last night was already remembered
 * (lib/admin/latestDayPreference.ts); this is the same shape for the range,
 * for the same reasons: localStorage through useSyncExternalStore, so the
 * first paint matches the server and a second admin window follows along,
 * and an in-memory copy where the browser refuses storage.
 */

const KEY = "purify:admin:traffic-chart-days";
const EVENT = "purify:admin:traffic-chart-days-change";
export const DEFAULT_CHART_RANGE: ChartRange = 30;

let memory: ChartRange = DEFAULT_CHART_RANGE;

/** A stored value as a range the chart offers, or the default. */
export function parseChartRange(raw: string | null | undefined): ChartRange {
  const days = Number(raw);
  return (CHART_RANGES as readonly number[]).includes(days) ? (days as ChartRange) : DEFAULT_CHART_RANGE;
}

function read(): ChartRange {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored !== null) return parseChartRange(stored);
  } catch {
    // fall through to the in-memory copy
  }
  return memory;
}

export function setChartRange(next: ChartRange): void {
  memory = next;
  try {
    window.localStorage.setItem(KEY, String(next));
  } catch {
    // remembered for this session only
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The range he last picked. The default on the server and on first paint. */
export function useChartRange(): ChartRange {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_CHART_RANGE);
}

// ── Which lines the chart draws ──────────────────────────────────────────
// His pick A on sheet r3-35: Visitors, Page views and Signups as switches on
// one chart, as the old Traffic tab had them. Remembered the same way as the
// range, so the chart opens as he left it.

export type ChartSeries = "visitors" | "views" | "signups";
export const SERIES_ORDER: readonly ChartSeries[] = ["visitors", "views", "signups"];
const SERIES_KEY = "purify:admin:traffic-chart-series";
let seriesMemory = "visitors";

/** A stored list as the lines to draw, in the chart's order; Visitors when it names none. */
export function parseChartSeries(raw: string | null | undefined): ChartSeries[] {
  const asked = new Set((raw ?? "").split(","));
  const on = SERIES_ORDER.filter((s) => asked.has(s));
  return on.length ? on : ["visitors"];
}

function readSeries(): string {
  try {
    const stored = window.localStorage.getItem(SERIES_KEY);
    if (stored !== null) return parseChartSeries(stored).join(",");
  } catch {
    // fall through to the in-memory copy
  }
  return seriesMemory;
}

export function setChartSeries(next: readonly ChartSeries[]): void {
  seriesMemory = parseChartSeries(next.join(",")).join(",");
  try {
    window.localStorage.setItem(SERIES_KEY, seriesMemory);
  } catch {
    // remembered for this session only
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The lines he left on, as a stable string (useSyncExternalStore compares snapshots by value). */
export function useChartSeriesKey(): string {
  return useSyncExternalStore(subscribe, readSeries, () => "visitors");
}
