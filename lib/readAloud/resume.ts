"use client";

// Where a reader stopped listening, kept for each book (1.9, the owner's
// "resume where you stopped, per book, from the lock screen too"; Listening 8
// of docs/1.9-build/BRAINSTORM.md).
//
// The one player is watched, whoever drives it: Listen, the dock, Now
// Playing, a pause from the lock screen or a headset, the sleep timer. While a
// chapter of the Bible plays, where it is is kept on the device every few
// seconds and again when it stops, one place for each book. Listen on that
// chapter then begins where the reader left it. The first seconds of a
// chapter and its last are not a place worth coming back to: a chapter
// barely begun starts again, and one heard to its end is done, so its place
// is let go.

import { getAudioSnapshot, subscribeAudio } from "@/lib/prayers/persistentAudioStore";

import { readingOfSrc } from "./chapters";

const KEY = "purify:readAloud.place";
/** A place older than this is forgotten: the reader has moved on. */
const KEEP_MS = 60 * 86_400_000;
/** Barely begun: the chapter starts again. */
const BEGUN_S = 10;
/** This close to the end, the chapter is heard. */
const DONE_S = 15;
/** How often a place is kept while it plays. */
const EVERY_MS = 5_000;

export type Place = { chapter: number; at: number; when: number };

function read(): Record<string, Place> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as unknown) : {};
    return all && typeof all === "object" ? (all as Record<string, Place>) : {};
  } catch {
    return {};
  }
}

function write(all: Record<string, Place>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* a full or private store: the reading starts from the top, as before */
  }
}

/** Where the reader stopped in a book, or null (never, long ago, or heard to the end). */
export function placeIn(book: string, now: number = Date.now()): Place | null {
  if (typeof window === "undefined") return null;
  const place = read()[book];
  if (!place || typeof place.at !== "number" || typeof place.chapter !== "number") return null;
  return now - (place.when ?? 0) > KEEP_MS ? null : place;
}

/** Keep where a chapter is (the player calls this as it plays and when it stops). */
export function keepPlace(book: string, chapter: number, at: number, duration: number, now: number = Date.now()): void {
  if (typeof window === "undefined" || !Number.isFinite(at)) return;
  const all = read();
  if (duration > 0 && at >= duration - DONE_S) {
    // Heard to its end: nothing to come back to in this chapter.
    if (all[book]?.chapter === chapter) {
      delete all[book];
      write(all);
    }
    return;
  }
  if (at < BEGUN_S) return;
  all[book] = { chapter, at: Math.floor(at), when: now };
  write(all);
}

/** Where Listen begins a chapter: where the reader stopped in it, or its start. */
export function startOf(book: string, chapter: number, now: number = Date.now()): number {
  const place = placeIn(book, now);
  return place && place.chapter === chapter ? place.at : 0;
}

let watching = false;

/**
 * Watch the one player and keep the place of whatever chapter it reads,
 * whoever paused it. Once for the life of the page.
 */
export function watchPlaces(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  let kept = 0;
  let last: { src: string | null; playing: boolean } = { src: null, playing: false };
  subscribeAudio(() => {
    const s = getAudioSnapshot();
    const reading = readingOfSrc(s.src);
    const stopped = last.src === s.src && last.playing && !s.playing;
    last = { src: s.src, playing: s.playing };
    if (!reading) return;
    const now = Date.now();
    // Every few seconds while it plays, and at once when it stops.
    if (!stopped && now - kept < EVERY_MS) return;
    kept = now;
    keepPlace(reading.book, reading.chapter, s.currentTime, s.duration, now);
  });
}

/** For tests: watch again from the start. */
export function resetPlacesForTests(): void {
  watching = false;
}
