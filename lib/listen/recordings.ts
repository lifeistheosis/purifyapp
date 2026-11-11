"use client";

import { useSyncExternalStore } from "react";

import bundled from "@/data/listen/index.json";
import { streamedUrl } from "@/lib/media/streamed";
import { isNativeClient } from "@/lib/platform/native";

import { parseListenId, type ListenRef, type ListenTimings } from "./texts";

/**
 * Which texts have a recording, and where each one is (1.9, ./texts.ts).
 *
 * A text shows Listen only once its recording is in the bucket and its
 * timings are on the website: the list says so. As with the Bible's chapters
 * (lib/readAloud/chapters.ts) there are two copies of it: data/listen/index.json,
 * which a build carries, and /audio/listen/index.json, which the apps ask
 * the website for, so a text recorded after an app was built gets Listen in
 * it and no store build ever waits on his PC (the owner's call of 2026-11-11,
 * through the arbiter). Both are written by scripts/listen-index.mjs from the
 * timings themselves, each checked against what was read.
 *
 * No reader meets a Listen that plays nothing: a text the list does not name
 * has no Listen at all.
 */

/** Where the website keeps the list of texts that have a recording. */
export const LISTEN_INDEX = "/audio/listen/index.json";

/** Where the recordings are: Purify's own bucket, beside the Bible's (lib/readAloud/chapters.ts). */
export const LISTEN_RECORDINGS = "https://audio.purifyapp.net/listen";

export function listenRecording(id: string): string {
  return `${LISTEN_RECORDINGS}/${id}.mp3`;
}

/** The recording a player address is, or null when it is no text's. */
export function listenOfSrc(src: string | null): { id: string; ref: ListenRef } | null {
  const m = src ? /\/listen\/((?:life|history|theology|council)\/[a-z0-9/-]+)\.mp3(?:$|\?)/.exec(src) : null;
  const ref = m ? parseListenId(m[1]) : null;
  return m && ref ? { id: m[1], ref } : null;
}

const wellFormed = (list: unknown): string[] => (Array.isArray(list) ? list.filter((id): id is string => typeof id === "string" && parseListenId(id) !== null) : []);

const CARRIED: ReadonlySet<string> = new Set(wellFormed(bundled));
let recorded: ReadonlySet<string> = CARRIED;
const listeners = new Set<() => void>();
let asked = false;

/** Ask the website once which texts have a recording now. The build's own list stands until it answers; a name is only ever added. */
function askTheWebsite(): void {
  if (asked || typeof window === "undefined") return;
  asked = true;
  fetch(streamedUrl(LISTEN_INDEX, isNativeClient()), { cache: "no-cache" })
    .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
    .then((list) => {
      const merged = new Set(recorded);
      for (const id of wellFormed(list)) merged.add(id);
      if (merged.size === recorded.size) return;
      recorded = merged;
      for (const changed of listeners) changed();
    })
    .catch(() => {});
}

export function hasListen(id: string): boolean {
  return recorded.has(id);
}

/** hasListen for a component, which draws again once the website's list names the text. */
export function useHasListen(id: string | null): boolean {
  return useSyncExternalStore(
    (changed) => {
      listeners.add(changed);
      askTheWebsite();
      return () => {
        listeners.delete(changed);
      };
    },
    () => (id ? hasListen(id) : false),
    () => (id ? CARRIED.has(id) : false),
  );
}

const timings = new Map<string, Promise<ListenTimings | null>>();

/** A recording's timings, from the website. Null when they cannot be had or are not timings. */
export function listenTimings(id: string): Promise<ListenTimings | null> {
  let p = timings.get(id);
  if (!p) {
    p = fetch(streamedUrl(`/audio/listen/${id}.json`))
      .then((r) => (r.ok ? (r.json() as Promise<ListenTimings>) : null))
      .then((t) => (t && Array.isArray(t.blocks) && typeof t.seconds === "number" ? t : null))
      .catch(() => null);
    timings.set(id, p);
  }
  return p;
}

/** The block being read at a moment, and the sentence in it: the last whose start has passed. */
export function readingAt(t: ListenTimings, time: number): { block: number; sentence: number } | null {
  let found: { block: number; sentence: number } | null = null;
  for (let b = 0; b < t.blocks.length; b += 1) {
    const s = t.blocks[b].s;
    for (let i = 0; i < s.length; i += 1) {
      if (s[i][0] <= time + 0.05) found = { block: b, sentence: i };
      else return found;
    }
  }
  return found;
}
