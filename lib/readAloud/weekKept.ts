"use client";

// Which saved chapters the week's readings put on the phone (1.9, s3-01 of
// docs/1.9-build/ideas.json; lib/readAloud/week.ts keeps them). By
// "book/chapter", the last day the chapter is read in the week it was kept
// for, so the chapters can be taken away again once that day has passed.
//
// A chapter here is the week's, not the reader's. A book the reader saves
// themselves (lib/readAloud/saving.ts) is theirs, its chapters the week had
// kept included: they leave this list, and stay on the phone.
//
// Its own module, apart from week.ts, so the saving can release a book
// without importing the week's whole calendar.

const KEY = "purify:readAloud.week.kept";

/** The week's chapters on the phone, by "book/chapter": the last day each is read, "YYYY-MM-DD". */
export function weekKept(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : {};
    if (!o || typeof o !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

function write(all: Record<string, string>): void {
  try {
    if (Object.keys(all).length) window.localStorage.setItem(KEY, JSON.stringify(all));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* a full or private store: the chapter stays, as one the reader saved */
  }
}

/** A chapter the week put on the phone, read until `lastDay`. */
export function keepForWeek(key: string, lastDay: string): void {
  const all = weekKept();
  if (!all[key] || all[key] < lastDay) all[key] = lastDay;
  write(all);
}

/** Chapters the week no longer keeps (taken off the phone, or the reader's now). */
export function forgetWeekKept(keys: readonly string[]): void {
  const all = weekKept();
  for (const k of keys) delete all[k];
  write(all);
}

/** A book the reader saves themselves is theirs: the week will not take its chapters away. */
export function releaseWeekBook(book: string): void {
  forgetWeekKept(Object.keys(weekKept()).filter((k) => k.startsWith(`${book}/`)));
}
