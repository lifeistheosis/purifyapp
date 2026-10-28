"use client";

import { useMemo, useSyncExternalStore } from "react";

import { currentTimeNow, getAudioSnapshot, subscribeAudio, type CaptionSource } from "@/lib/prayers/persistentAudioStore";

import { captionLines, lineAt, type CaptionLine } from "./captions";

/**
 * The one clock the words are lit by (1.8). Now Playing's words, a chant's
 * Sing along and the verse count over them all read it, so two places on the
 * screen can never light two different lines (the owner's picks of
 * 2026-10-27: the player's two views, round 8, and a chant's page, round 9,
 * built together on the one player).
 *
 * It reads the audio's own clock (currentTimeNow) once a frame while
 * something plays, because the snapshot only moves four times a second and
 * the light would step, and once on every change while paused (a seek, a tap
 * on a line). Every reader of a tick reads the same moment. It runs only
 * while someone is listening.
 */
let now = 0;
let frame = 0;
let offAudio: (() => void) | null = null;
const listeners = new Set<() => void>();

function tick(): void {
  frame = 0;
  now = currentTimeNow();
  for (const listener of listeners) listener();
  if (listeners.size && getAudioSnapshot().playing) frame = requestAnimationFrame(tick);
}

/** A change in the player: a frame loop already running will see it. */
function wake(): void {
  if (!frame) tick();
}

export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  offAudio ??= subscribeAudio(wake);
  wake();
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    offAudio?.();
    offAudio = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
}

/** The moment of the last tick, in seconds; the player's own clock while nothing listens. */
export function clockNow(): number {
  return listeners.size ? now : currentTimeNow();
}

const quiet = () => () => {};

/**
 * A recording's timed lines and the one being sung or read now: -1 before
 * the first, and whenever `live` is false (another recording is playing, or
 * nothing is). `timed` says every line has its time, which is when lines
 * light at all.
 */
export function useSungLines(
  source: CaptionSource | null,
  duration: number,
  live: boolean,
): { lines: CaptionLine[]; timed: boolean; current: number } {
  const lines = useMemo(() => (source ? captionLines(source, duration) : []), [source, duration]);
  const timed = Boolean(source && source.length > 0 && lines.length === source.length);
  const on = live && timed;
  const current = useSyncExternalStore(
    on ? subscribeClock : quiet,
    () => (on ? lineAt(lines, clockNow()) : -1),
    () => -1,
  );
  return { lines, timed, current };
}
