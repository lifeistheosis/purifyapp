import { readSpeed } from "@/lib/player/speed";
import { getAudioSnapshot, pause, play, seek, setLoopMode, setTrack, subscribeAudio } from "@/lib/prayers/persistentAudioStore";
import { hasReadAloud, readAloudManifest, readAloudSrc, verseCaptions, type ReadAloudManifest } from "@/lib/readAloud/chapters";
import { readAloudCover } from "@/lib/readAloud/covers";

import type { FlowItem } from "./flow";

/**
 * Today's readings, read aloud (1.8, the owner's yes of 2026-10-24): one tap
 * on Today plays the day's passages one after another, each only the verses
 * the Church reads that day, cut out of its chapter's recording by the verse
 * timings the read-aloud already carries (lib/readAloud/chapters.ts). A
 * passage whose chapter has no reading yet is left out.
 *
 * It plays through the app's one player, so the mini player, Now Playing and
 * the lock screen show it, with the evangelist or apostle on the cover.
 * Playing anything else ends it; so does the last verse of the last passage.
 * It plays at the reader's speed (lib/player/speed.ts), as Listen does, and
 * from 1.8 the player's previous and next step from one reading to the one
 * before or after it (listeningPlace, stepListening).
 */

/** One span to hear: a run of verses in one chapter. */
export type ListenPart = {
  book: string;
  chapter: number;
  from: number;
  /** Past the chapter's last verse means to the chapter's end. */
  to: number;
  /** What the player shows: the reference, then which reading it is. */
  title: string;
  artist: string;
};

/** Every span of every reading that has a recording, in the walk's order. */
export function listenParts(
  items: FlowItem[],
  names: (item: FlowItem) => { title: string; artist: string },
  heard: (book: string, chapter: number) => boolean = hasReadAloud,
): ListenPart[] {
  return items
    .filter((item) => heard(item.book, item.chapter))
    .flatMap((item) => {
      const { title, artist } = names(item);
      return item.ranges.map(([from, to]) => ({ book: item.book, chapter: item.chapter, from, to, title, artist }));
    });
}

/**
 * Where a span starts and ends in its chapter's recording, in seconds: from
 * the first verse it reads to the end of its last. Null when the recording's
 * timings hold none of its verses.
 */
export function spanTimes(manifest: ReadAloudManifest, from: number, to: number): { start: number; end: number } | null {
  const inSpan = manifest.verses.filter((v) => v.n >= from && v.n <= to);
  if (!inSpan.length) return null;
  return { start: inSpan[0].at, end: inSpan[inSpan.length - 1].end };
}

type Run = {
  parts: ListenPart[];
  at: number;
  src: string;
  start: number;
  end: number;
  /** The player is at this span's first verse (a fresh chapter has to load first). */
  placed: boolean;
  /** The next span's timings are on their way. */
  loading: boolean;
  /** Where the player was when last seen, to tell the span's end from a pause. */
  last: number;
};

let run: Run | null = null;
let stopWatching: (() => void) | null = null;

/**
 * Where the readings are, for the player's previous and next (1.8): the
 * recording being heard, and the reading before and after the one being
 * heard by their titles, or null at either end. Null when no reading is
 * being heard.
 */
export type ListeningPlace = { src: string; previous: string | null; next: string | null };

let place: ListeningPlace | null = null;
const placeWatchers = new Set<() => void>();

/** Say where the readings are now, to whoever shows it, when it changes. */
function tellPlace(): void {
  const current = run;
  const next: ListeningPlace | null =
    current && current.at >= 0
      ? { src: current.src, previous: current.parts[current.at - 1]?.title ?? null, next: current.parts[current.at + 1]?.title ?? null }
      : null;
  if (next?.src === place?.src && next?.previous === place?.previous && next?.next === place?.next) return;
  place = next;
  for (const watcher of placeWatchers) watcher();
}

/** Where the readings are now (ListeningPlace). */
export function listeningPlace(): ListeningPlace | null {
  return place;
}

/** Be told when the readings move on, start or stop. */
export function subscribeListening(watcher: () => void): () => void {
  placeWatchers.add(watcher);
  return () => {
    placeWatchers.delete(watcher);
  };
}

/** Whether today's readings are what the player is reading now. */
export function isListening(): boolean {
  return run !== null;
}

/** Hear the parts from the first. Starting again starts over. */
export function startListening(parts: ListenPart[]): void {
  stopListening();
  if (!parts.length) return;
  run = { parts, at: -1, src: "", start: 0, end: 0, placed: false, loading: false, last: 0 };
  stopWatching = subscribeAudio(watch);
  void playPart(0);
}

/** Let go of the readings; whatever is playing goes on as it is. */
export function stopListening(): void {
  stopWatching?.();
  stopWatching = null;
  run = null;
  tellPlace();
}

/**
 * The reading before (-1) or after (1) the one being heard, from its first
 * verse (1.8, the player's previous and next). Nothing at either end.
 */
export function stepListening(by: -1 | 1): void {
  const current = run;
  if (!current || current.at < 0) return;
  const to = current.at + by;
  if (to < 0 || to >= current.parts.length) return;
  // Marked first, so the player's news of the change does not move it on twice.
  current.loading = true;
  void playPart(to);
}

async function playPart(i: number): Promise<void> {
  const current = run;
  if (!current) return;
  const part = current.parts[i];
  if (!part) {
    pause();
    stopListening();
    return;
  }
  current.loading = true;
  const manifest = await readAloudManifest(part.book, part.chapter);
  // Stopped, or started over, while the timings were on their way.
  if (run !== current) return;
  const times = manifest ? spanTimes(manifest, part.from, part.to) : null;
  if (!manifest || !times) {
    await playPart(i + 1);
    return;
  }
  const src = readAloudSrc(part.book, part.chapter);
  const cover = readAloudCover(part.book);
  Object.assign(current, { at: i, src, start: times.start, end: times.end, last: times.start });
  tellPlace();
  setTrack(src, {
    title: part.title,
    artist: part.artist,
    art: cover.src,
    artFallback: cover.fallback,
    artSize: cover.size ?? undefined,
    captions: verseCaptions(manifest),
    rate: readSpeed(),
  });
  setLoopMode("off");
  // A second span in the chapter already loaded can be placed at once; a
  // chapter that is still loading is placed when its length is known (watch).
  const loaded = getAudioSnapshot().duration > 0 && getAudioSnapshot().src === src;
  current.placed = loaded;
  current.loading = false;
  if (loaded) seek(times.start);
  play();
}

function watch(): void {
  const current = run;
  if (!current || current.loading || current.at < 0) return;
  const s = getAudioSnapshot();
  // Something else was put on: the readings give way to it.
  if (s.src !== current.src) {
    stopListening();
    return;
  }
  if (!current.placed) {
    if (s.duration > 0) {
      current.placed = true;
      seek(current.start);
    }
    return;
  }
  // The span's last verse is read, or the recording ran out at the chapter's
  // end (the player rewinds itself to 0 then, so the last place seen says it).
  const ranOut = !s.playing && s.currentTime === 0 && current.last >= current.end - 1;
  if (s.currentTime >= current.end || ranOut) {
    // Marked first, so the pause's own news does not move it on twice.
    current.loading = true;
    pause();
    void playPart(current.at + 1);
    return;
  }
  current.last = s.currentTime;
}
