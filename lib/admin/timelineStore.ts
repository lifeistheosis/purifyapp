"use client";

import { useEffect, useSyncExternalStore } from "react";

import { adminJson } from "./fetchJson";
import type { SinceEvent } from "./since";
import { mergeEvents, mergeTimes } from "./timeline";

/**
 * The log that never resets, held once for the whole panel: Home's timeline
 * and the bell read the same pages, so they never disagree and the database
 * is asked once (lib/admin/timeline.ts says what the log is and why).
 *
 * The newest week is read when the first reader mounts; older weeks when a
 * reader asks (Home's Show more and its scroll, the bell's last card); and
 * every minute while the page is on screen, what happened since the last read
 * is added on top. Nothing is ever taken out of it while the panel is open,
 * and the server has every row, so a reload shows the same log.
 */

type Payload = {
  from: string;
  to: string;
  now: string;
  more: boolean;
  line: { at: string; basis: string } | null;
  events: SinceEvent[];
  readers: { count: number | null; times: string[] };
  orderCents: number;
  unread: string[];
  full: string[];
};

export type TimelineState = {
  status: "idle" | "loading" | "ready" | "failed";
  /** Every row read so far, each once, newest first. */
  events: SinceEvent[];
  /** When each new reader joined, every page's. */
  readerTimes: string[];
  /** The start of the oldest week read. */
  oldest: string | null;
  more: boolean;
  loadingMore: boolean;
  moreFailed: boolean;
  /** Where he last looked: from his use log, or where he marked all as seen. */
  line: { at: string; basis: string } | null;
  unread: string[];
  full: string[];
};

const INITIAL: TimelineState = {
  status: "idle",
  events: [],
  readerTimes: [],
  oldest: null,
  more: false,
  loadingMore: false,
  moreFailed: false,
  line: null,
  unread: [],
  full: [],
};

const URL = "/api/admin/timeline";
/** A refresh reaches this far behind the last read, so a row stamped late is not missed. */
const OVERLAP_MS = 2 * 60_000;
const REFRESH_MS = 60_000;

let state: TimelineState = INITIAL;
const listeners = new Set<() => void>();
const eventLists: SinceEvent[][] = [];
const timeLists: string[][] = [];
let lastNow: string | null = null;
let readers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function publish(patch: Partial<TimelineState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function absorb(p: Payload): Partial<TimelineState> {
  eventLists.push(p.events ?? []);
  timeLists.push(p.readers?.times ?? []);
  return { events: mergeEvents(eventLists), readerTimes: mergeTimes(timeLists) };
}

function start(): void {
  if (state.status === "loading" || state.status === "ready") return;
  publish({ status: "loading" });
  void adminJson<Payload>(URL).then((p) => {
    if (!p) return publish({ status: "failed" });
    lastNow = p.now;
    publish({
      ...absorb(p),
      status: "ready",
      oldest: p.from,
      more: p.more,
      line: state.line ?? p.line,
      unread: p.unread ?? [],
      full: p.full ?? [],
    });
  });
}

/** The week before the oldest one read. */
export function loadOlder(): void {
  if (state.status !== "ready" || !state.more || state.loadingMore || !state.oldest) return;
  publish({ loadingMore: true, moreFailed: false });
  void adminJson<Payload>(`${URL}?before=${encodeURIComponent(state.oldest)}`).then((p) => {
    if (!p) return publish({ loadingMore: false, moreFailed: true });
    publish({
      ...absorb(p),
      loadingMore: false,
      oldest: p.from,
      more: p.more,
      full: [...new Set([...state.full, ...(p.full ?? [])])],
    });
  });
}

function refreshNewest(): void {
  if (state.status !== "ready" || !lastNow) return;
  const after = new Date(Date.parse(lastNow) - OVERLAP_MS).toISOString();
  void adminJson<Payload>(`${URL}?after=${encodeURIComponent(after)}`).then((p) => {
    if (!p) return;
    lastNow = p.now;
    publish(absorb(p));
  });
}

/** Mark all as seen: the line moves to now. Nothing above it is removed. */
export function moveLine(at: string): void {
  publish({ line: { at, basis: "mark" } });
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The log, read once for every reader on the page and kept current while one is mounted. */
export function useTimeline(): TimelineState {
  const snap = useSyncExternalStore(subscribe, () => state, () => INITIAL);
  useEffect(() => {
    readers += 1;
    start();
    if (!timer) {
      timer = setInterval(() => {
        if (document.visibilityState === "visible") refreshNewest();
      }, REFRESH_MS);
    }
    return () => {
      readers -= 1;
      if (readers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return snap;
}

/** For tests: forget everything read. */
export function resetTimelineForTests(): void {
  state = INITIAL;
  eventLists.length = 0;
  timeLists.length = 0;
  lastNow = null;
}
