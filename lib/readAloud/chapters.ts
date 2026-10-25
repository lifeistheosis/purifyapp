import { useSyncExternalStore } from "react";

import bundled from "@/data/readAloud/index.json";
import { streamedUrl } from "@/lib/media/streamed";
import { isNativeClient } from "@/lib/platform/native";

import { savedSrc } from "./offline";

/**
 * Read-aloud (1.7): a chapter read by a voice, verse by verse, each verse's
 * start and end known, so the reader lights the verse being read
 * (components/bible/ReadAloudFollow.tsx). The audio and its timings are made
 * ahead by Homebase/tools/tts-bakeoff/read_bible.py and shipped under
 * public/audio/read/<book>/<chapter>.{mp3,json}.
 *
 * Every chapter, not John 1 alone (the owner, 2026-10-20: "the reader's not
 * there anymore. So, let's get that"; John 1's voice for all of it, the New
 * Testament first). The whole Bible is about 86 hours of audio, so the files
 * live on the website alone and the apps ask for them there
 * (lib/media/streamed.ts), and the list of chapters that have a reading is
 * the website's too: data/readAloud/index.json is the copy a build carries,
 * public/audio/read/index.json the copy the apps ask the website for, so a
 * chapter read after an app was built still gets Listen. Both are written by
 * scripts/read-aloud-index.mjs from the files themselves.
 *
 * Free for every reader with one voice; Premium gets every voice (the
 * owner's word of 2026-10-15). The one voice is Kokoro's "Heart", John 1's.
 */
export type ReadAloudVerse = { n: number; at: number; end: number; text?: string };
export type ReadAloudManifest = { voice: string; seconds: number; verses: ReadAloudVerse[] };

/** Where the website keeps the list of chapters that have a reading. */
export const READ_ALOUD_INDEX = "/audio/read/index.json";

const CARRIED: ReadonlySet<string> = new Set(bundled as string[]);
let chapters: ReadonlySet<string> = CARRIED;
const listeners = new Set<() => void>();
let asked = false;

/**
 * In the apps, ask the website once which chapters have a reading now. The
 * build's own list stands until the answer comes, and stands alone offline.
 * Only well formed keys are taken, and a key is only ever added.
 */
function askTheWebsite(): void {
  if (asked || typeof window === "undefined" || !isNativeClient()) return;
  asked = true;
  fetch(streamedUrl(READ_ALOUD_INDEX, true), { cache: "no-cache" })
    .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
    .then((list) => {
      if (!Array.isArray(list)) return;
      const merged = new Set(chapters);
      for (const key of list) if (typeof key === "string" && /^[a-z0-9-]+\/\d{1,3}$/.test(key)) merged.add(key);
      if (merged.size === chapters.size) return;
      chapters = merged;
      for (const changed of listeners) changed();
    })
    .catch(() => {});
}

export function hasReadAloud(book: string, chapter: number): boolean {
  return chapters.has(`${book}/${chapter}`);
}

/** hasReadAloud for a component, which draws again once the website's list names the chapter. */
export function useHasReadAloud(book: string, chapter: number): boolean {
  return useSyncExternalStore(
    (changed) => {
      listeners.add(changed);
      askTheWebsite();
      return () => {
        listeners.delete(changed);
      };
    },
    () => hasReadAloud(book, chapter),
    () => CARRIED.has(`${book}/${chapter}`),
  );
}

/**
 * A chapter's recording: the website's in the apps, the page's own on the
 * web; in the apps, the copy saved on the phone when the reader saved its
 * book for offline listening (lib/readAloud/offline.ts).
 */
export function readAloudSrc(book: string, chapter: number, native: boolean = isNativeClient()): string {
  return (native ? savedSrc(book, chapter) : null) ?? streamedUrl(`/audio/read/${book}/${chapter}.mp3`, native);
}

const manifests = new Map<string, Promise<ReadAloudManifest | null>>();

export function readAloudManifest(book: string, chapter: number): Promise<ReadAloudManifest | null> {
  const key = `${book}/${chapter}`;
  let p = manifests.get(key);
  if (!p) {
    const saved = isNativeClient() ? savedSrc(book, chapter, "json") : null;
    p = fetch(saved ?? streamedUrl(`/audio/read/${book}/${chapter}.json`))
      .then((r) => (r.ok ? (r.json() as Promise<ReadAloudManifest>) : null))
      .catch(() => null);
    manifests.set(key, p);
  }
  return p;
}

/**
 * The verse being read at a moment: the last whose start has passed. The
 * pause after a verse still belongs to it.
 */
export function verseAt(manifest: ReadAloudManifest, t: number): number | null {
  let found: number | null = null;
  for (const v of manifest.verses) {
    if (v.at <= t + 0.05) found = v.n;
    else break;
  }
  return found;
}
