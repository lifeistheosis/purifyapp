"use client";

// The coming week's daily readings, kept on the phone by themselves (1.9,
// s3-01 of docs/1.9-build/ideas.json: "keep the coming week's daily readings
// on the phone by themselves, on Wi-Fi, for Plus: in church and on the road
// without thinking about it").
//
// When the app opens and comes back to the front (components/native/
// SavingBridge.tsx), for a reader with Plus, on Wi-Fi: every chapter read
// aloud that the Church reads in the next seven days, by the reader's
// calendar (the day's own readings, a great feast's ordinary pair, the
// saints'), is saved as a book saved to listen offline is
// (lib/readAloud/offline.ts), and noted as the week's (./weekKept.ts). Once
// the last day a chapter is read has passed, the week takes it away again,
// unless the reader has saved its book themselves since.
//
// Only on Wi-Fi, never on mobile data, never on a connection the phone
// cannot name: nobody asked for these, so they cost nothing. On by default
// for Plus, off in Settings (components/settings/StorageSection.tsx, which
// also shows what it keeps). On iPhone too since 1.9 (his "everything in
// 1.9", 2026-11-10): it waited for the recordings to leave the folder iCloud
// backs up, which Apple's rules keep for what cannot be fetched again, and
// they now live in the Library kept out of backups (./offline.ts, home;
// ideas.json c-ios-offline-backup).

import { useSyncExternalStore } from "react";

import { dayReadings, readingsOptionsFor, startOfDayLocal, type CalStyle } from "@/lib/calendar/orthodox";
import { readCalendarStyleDefault } from "@/lib/calendar/styleDefault";
import { plusFeaturesNow } from "@/lib/entitlements/usePlusFeatures";
import { streamedUrl } from "@/lib/media/streamed";
import { isNativeClient } from "@/lib/platform/native";

import { hasReadAloud, readAloudRecording } from "./chapters";
import { onSavedChange, removeChapter, saveChapters, savedChapters, type Saved } from "./offline";
import { connection, getSaving } from "./saving";
import { forgetWeekKept, keepForWeek, weekKept } from "./weekKept";

/** How many days ahead are kept: today and the six after it. */
export const WEEK_DAYS = 7;

const SETTING = "purify:readAloud.week";
const EVENT = "purify:readAloud.week";

/** A chapter the week reads aloud, and the last day it is read, "YYYY-MM-DD". */
export type WeekChapter = { book: string; chapter: number; lastDay: string };

/** A day (the calendar's UTC noon) as "YYYY-MM-DD". */
export function dayKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/**
 * Every chapter with a reading that the Church reads from `today` for
 * `days` days, by the reader's calendar, once each, with the last of those
 * days. As Today lists a day's readings (lib/readings/flow.ts, dayWalk).
 */
export function weekChapters(
  today: Date,
  style: CalStyle,
  heard: (book: string, chapter: number) => boolean = hasReadAloud,
  days: number = WEEK_DAYS,
): WeekChapter[] {
  const out = new Map<string, WeekChapter>();
  for (let i = 0; i < days; i++) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() + i);
    const r = dayReadings(day, readingsOptionsFor(style));
    for (const ref of [...r.readings, ...r.ordinary, ...r.commemoration]) {
      if (!heard(ref.book, ref.chapter)) continue;
      const key = `${ref.book}/${ref.chapter}`;
      out.delete(key);
      out.set(key, { book: ref.book, chapter: ref.chapter, lastDay: dayKey(day) });
    }
  }
  return [...out.values()].sort((a, b) => a.lastDay.localeCompare(b.lastDay) || a.book.localeCompare(b.book) || a.chapter - b.chapter);
}

/** The week's chapters whose last day has passed. */
export function pastChapters(kept: Record<string, string>, todayKey: string): string[] {
  return Object.entries(kept)
    .filter(([, last]) => last < todayKey)
    .map(([key]) => key);
}

/** Whether the week's readings are kept: yes, unless the reader turned it off. */
export function weekReadingsOn(): boolean {
  try {
    return window.localStorage.getItem(SETTING) !== "0";
  } catch {
    return false;
  }
}

function emit(): void {
  window.dispatchEvent(new Event(EVENT));
}

let running = false;

async function takeAway(keys: readonly string[]): Promise<void> {
  for (const key of keys) {
    const [book, chapter] = key.split("/");
    await removeChapter(book, Number(chapter));
    forgetWeekKept([key]);
  }
}

/**
 * Keep the coming week: take away the chapters whose day has passed, then,
 * if it is on, on Wi-Fi, for a reader with Plus, save the ones not on the
 * phone. The apps only. The reader's own saving goes first.
 */
export async function keepWeek(now: Date = new Date()): Promise<void> {
  if (running || !isNativeClient()) return;
  running = true;
  try {
    const today = startOfDayLocal(now);
    await takeAway(pastChapters(weekKept(), dayKey(today)));
    if (!weekReadingsOn()) return;
    const job = getSaving().job;
    if (job && !job.waiting) return;
    // Only with a sure yes: nothing is fetched on a guess.
    if ((await plusFeaturesNow()) !== true) return;
    const net = connection();
    const onWifi = async () => {
      const s = await net.status();
      return s.connected && s.type === "wifi";
    };
    if (!(await onWifi())) return;

    for (const c of weekChapters(today, readCalendarStyleDefault())) {
      const key = `${c.book}/${c.chapter}`;
      if (savedChapters()[key]) {
        // On the phone already: the reader's own stays theirs; one the week
        // kept is kept to its new last day.
        if (weekKept()[key]) keepForWeek(key, c.lastDay);
        continue;
      }
      if (!weekReadingsOn() || !(await onWifi())) break;
      const { saved } = await saveChapters(c.book, [c.chapter], (n) => ({
        mp3: readAloudRecording(c.book, n),
        json: streamedUrl(`/audio/read/${c.book}/${n}.json`, true),
      }));
      if (saved) keepForWeek(key, c.lastDay);
    }
  } finally {
    running = false;
    emit();
  }
}

/** Turn the week's readings on or off. Off takes away every chapter it kept. */
export async function setWeekReadings(on: boolean): Promise<void> {
  try {
    window.localStorage.setItem(SETTING, on ? "1" : "0");
  } catch {
    /* private mode: it holds for this session */
  }
  emit();
  if (on) void keepWeek();
  else await takeAway(Object.keys(weekKept()));
  emit();
}

export type WeekState = { on: boolean; chapters: number; bytes: number };

const OFF: WeekState = { on: false, chapters: 0, bytes: 0 };
let snap: WeekState = OFF;

/** The setting, and what the week keeps on the phone now. */
export function weekState(saved: Record<string, Saved> = savedChapters()): WeekState {
  const kept = Object.keys(weekKept()).filter((k) => saved[k]);
  const next = { on: weekReadingsOn(), chapters: kept.length, bytes: kept.reduce((n, k) => n + (saved[k].bytes || 0), 0) };
  if (next.on !== snap.on || next.chapters !== snap.chapters || next.bytes !== snap.bytes) snap = next;
  return snap;
}

function subscribe(changed: () => void): () => void {
  const offSaved = onSavedChange(changed);
  window.addEventListener(EVENT, changed);
  return () => {
    offSaved();
    window.removeEventListener(EVENT, changed);
  };
}

export function useWeekReadings(): WeekState {
  return useSyncExternalStore(subscribe, () => weekState(), () => OFF);
}

/** For tests: forget that a run is under way. */
export function resetWeekForTests(): void {
  running = false;
  snap = OFF;
}
