"use client";

import { useSyncExternalStore } from "react";

/**
 * Persistent in-memory audio player. Keeps a single `HTMLAudioElement`
 * alive at module scope (outside React) so playback survives route
 * changes, component unmounts, and any UI reorganisation. The actual
 * `<audio>` is never inserted into the DOM — modern browsers play
 * an `HTMLAudioElement` regardless of its mount state, so there is
 * nothing for React to tear down on navigation.
 *
 * Why this lives at module scope rather than in a layout-mounted
 * component:
 *
 *  - `AnthemPage` currently owns an `<audio ref>` inside its
 *    `AudioPlayer` component. The moment the user navigates away,
 *    React unmounts the page, the ref is dropped, and the
 *    underlying audio element is GC'd. Audio stops mid-line.
 *  - A layout-mounted React component would work, but every UI
 *    surface that wants to start a track would need to thread
 *    state through context. The store pattern (already used by
 *    `installPromptStore` and `ReaderPrefs`) is simpler: one
 *    module, multiple subscribers via `useSyncExternalStore`.
 *
 * Consumers (1.7):
 *  - `lib/chants/play.ts` loads a chant's recording with its cover and
 *    timed words, for the chant pages and Pray with chant.
 *  - `components/prayers/NowPlayingBar.tsx`, the mini player, and
 *    `components/player/NowPlayingSheet.tsx`, Now Playing with its live
 *    captions (`components/player/LiveCaptions.tsx`), render against
 *    this one snapshot: no local audio ref, no local play state.
 */

export type LoopMode = "off" | "inf" | 3 | 7 | 12;

/** One timed line of words: a chant's lines, the read-aloud's verses.
 *  `time` is where the line starts, in seconds, and `end`, when the timing
 *  file knows it, where the singing or reading of it stops. `text` is what is
 *  sung or read, in its own words. `en` (1.8, Sing along) is the English of a
 *  line sung in another language, drawn over it as the line to read, the
 *  sung words under it. `sub` goes under the sung words: a transliteration
 *  where the script is not Latin. `n` is a verse's number, for "Verse 4 of
 *  51" over the words. */
export type CaptionSource = { time?: number; end?: number; text: string; en?: string; sub?: string[]; n?: number }[];

/** Whether the player stops by itself at the end of the track. A timer of
 *  so many minutes is lib/player/sleep.ts's (1.7): it times the ambience
 *  too, so it outlives the track. */
export type SleepTimer = { kind: "off" } | { kind: "end" };

export type AudioSnapshot = {
  /** Current src, or null if nothing has been loaded. */
  src: string | null;
  title: string | null;
  artist: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  loopMode: LoopMode;
  /** The picture Now Playing shows (1.7). */
  art: string | null;
  /** A bundled picture shown when `art` cannot load (1.7): a read-aloud
   *  cover is on the website, and an app with no signal shows the plate. */
  artFallback: string | null;
  /** Timed lines for the live captions (1.7), or null for none. */
  captions: CaptionSource | null;
  /** Right-to-left captions (Arabic). Each line also sets its own
   *  direction, so a Latin transliteration under it reads left to right. */
  rtl: boolean;
  /** Playback speed: 1 is as recorded. */
  rate: number;
  sleep: SleepTimer;
};

let audioEl: HTMLAudioElement | null = null;
const subscribers = new Set<() => void>();
let snapshot: AudioSnapshot = {
  src: null,
  title: null,
  artist: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  loopMode: "off",
  art: null,
  artFallback: null,
  captions: null,
  rtl: false,
  rate: 1,
  sleep: { kind: "off" },
};
// Remaining replays for finite loop counts. Module-level so the
// `ended` listener reads the latest value without being re-bound.
let repeatsLeft = 0;

function emit() {
  for (const cb of subscribers) {
    try {
      cb();
    } catch {
      /* ignore subscriber errors */
    }
  }
}

function update(patch: Partial<AudioSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  emit();
}

/**
 * Play, and say so when it cannot. With no signal, or no source the device
 * can play, the browser refuses the promise play() returns: left uncaught,
 * that is an error on the page (the export walk counts it, 2026-10-26), and
 * the bar would go on saying it plays.
 */
function tryPlay(a: HTMLAudioElement): void {
  a.play().catch(() => update({ playing: false }));
}

function ensureElement(): HTMLAudioElement {
  if (audioEl) return audioEl;
  if (typeof window === "undefined") {
    throw new Error("persistentAudioStore: audio unavailable on server");
  }
  const a = new Audio();
  a.preload = "metadata";

  a.addEventListener("timeupdate", () => {
    update({ currentTime: a.currentTime });
  });
  a.addEventListener("loadedmetadata", () => {
    update({ duration: a.duration });
  });
  a.addEventListener("durationchange", () => {
    update({ duration: a.duration });
  });
  a.addEventListener("play", () => {
    update({ playing: true });
  });
  a.addEventListener("pause", () => {
    update({ playing: false });
  });
  a.addEventListener("ended", () => {
    // A sleep timer set to the end of the track wins over any loop.
    if (snapshot.sleep.kind === "end") {
      a.loop = false;
      repeatsLeft = 0;
      update({ playing: false, currentTime: 0, sleep: { kind: "off" } });
      return;
    }
    if (repeatsLeft > 0) {
      repeatsLeft -= 1;
      a.currentTime = 0;
      tryPlay(a);
      return;
    }
    update({ playing: false, currentTime: 0 });
  });

  // MediaSession integration so the OS / lock screen / Bluetooth
  // controls can play/pause the anthem even after the user has
  // navigated to another page or backgrounded the tab.
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", () => {
        tryPlay(a);
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        a.pause();
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        a.pause();
        a.currentTime = 0;
        update({ playing: false, currentTime: 0 });
      });
      // Back 15 and forward 15 on the lock screen, as in the player (1.7).
      navigator.mediaSession.setActionHandler("seekbackward", () => skipBy(-15));
      navigator.mediaSession.setActionHandler("seekforward", () => skipBy(15));
    } catch {
      /* some action types may not be supported */
    }
  }

  audioEl = a;
  return a;
}

/**
 * Load a track. If the same src is already loaded, this is a
 * no-op (the current playback position and play/pause state are
 * preserved — important for re-mounting the player on the same
 * page after a sub-navigation). If a different src is provided,
 * the track is switched and playback resets to 0.
 */
export function setTrack(
  src: string,
  opts: {
    title?: string;
    artist?: string;
    art?: string;
    /** Shown when `art` cannot load. */
    artFallback?: string;
    /** The picture's real size, for the lock screen: "1024x1024". */
    artSize?: string;
    captions?: CaptionSource;
    rtl?: boolean;
    /**
     * How fast it plays (1.8): the reader's speed for the Bible read aloud
     * (lib/player/speed.ts). A new track that does not ask plays as recorded,
     * at 1, so a chant is never sped up by the speed a reading was left at.
     */
    rate?: number;
  } = {},
): void {
  const a = ensureElement();
  const sameSrc = a.src.endsWith(src) || a.src === src;
  if (!sameSrc) {
    const rate = clampRate(opts.rate ?? 1);
    // Loading a source sets the speed back to the default one, so the default
    // is set first, and the speed again after.
    a.defaultPlaybackRate = rate;
    a.src = src;
    a.load();
    a.playbackRate = rate;
    update({
      src,
      title: opts.title ?? null,
      artist: opts.artist ?? null,
      art: opts.art ?? null,
      artFallback: opts.artFallback ?? null,
      captions: opts.captions ?? null,
      rtl: opts.rtl ?? false,
      rate,
      currentTime: 0,
      duration: 0,
    });
  } else {
    // Refresh what the consumer passed: a remount keeps the playback.
    if (opts.rate !== undefined) applyRate(a, clampRate(opts.rate));
    update({
      src,
      title: opts.title ?? snapshot.title,
      artist: opts.artist ?? snapshot.artist,
      art: opts.art ?? snapshot.art,
      artFallback: opts.artFallback ?? snapshot.artFallback,
      captions: opts.captions ?? snapshot.captions,
      rtl: opts.rtl ?? snapshot.rtl,
      rate: opts.rate !== undefined ? clampRate(opts.rate) : snapshot.rate,
    });
  }
  // MediaSession metadata for OS lock-screen controls, with the picture.
  if ("mediaSession" in navigator && (opts.title || opts.artist)) {
    try {
      const art = opts.art ?? snapshot.art;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: opts.title ?? "",
        // Never "Purify" for a recording Purify did not make: the chant
        // player names the singer, or the version when nobody is known.
        artist: opts.artist ?? "",
        album: "Purify",
        ...(art ? { artwork: [{ src: new URL(art, window.location.href).href, sizes: opts.artSize ?? "512x512", type: pictureType(art) }] } : {}),
      });
    } catch {
      /* MediaMetadata unsupported on some browsers */
    }
  }
}

/** The picture's type from its name, for the lock screen. */
function pictureType(src: string): string {
  if (/\.png(\?|$)/i.test(src)) return "image/png";
  if (/\.webp(\?|$)/i.test(src)) return "image/webp";
  return "image/jpeg";
}

/** What is loaded now, outside React: a caller that waited for something
 *  (a chant's timed words) checks it is still the same track. */
export function currentSrc(): string | null {
  return snapshot.src;
}

/** Where the track is this instant: the element's own clock, which moves
 *  smoothly, where the snapshot only moves on timeupdate (four times a
 *  second). For the live captions' word-by-word light. */
export function currentTimeNow(): number {
  return audioEl ? audioEl.currentTime : snapshot.currentTime;
}

/** A speed the player will take: 0.5 to 2. */
function clampRate(rate: number): number {
  return Number.isFinite(rate) ? Math.max(0.5, Math.min(2, rate)) : 1;
}

/** The element's speed now, and the one a reload falls back to. */
function applyRate(a: HTMLAudioElement, rate: number): void {
  a.defaultPlaybackRate = rate;
  a.playbackRate = rate;
}

/** Playback speed, for reading aloud (1 is as recorded). */
export function setRate(rate: number): void {
  const r = clampRate(rate);
  if (audioEl) applyRate(audioEl, r);
  update({ rate: r });
}

/** Back or forward by so many seconds, inside the track. */
export function skipBy(seconds: number): void {
  const a = ensureElement();
  const end = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : snapshot.duration;
  const t = Math.max(0, Math.min(end || 0, a.currentTime + seconds));
  a.currentTime = t;
  update({ currentTime: t });
}

/** Stop by itself at the end of the track, or not. Set through
 *  lib/player/sleep.ts, which keeps the one timer for everything that plays. */
export function setSleep(next: SleepTimer): void {
  update({ sleep: next });
}

export function play(): void {
  const a = ensureElement();
  tryPlay(a);
}

export function pause(): void {
  if (audioEl) audioEl.pause();
}

export function toggle(): void {
  const a = ensureElement();
  if (a.paused) tryPlay(a);
  else a.pause();
}

export function seek(t: number): void {
  const a = ensureElement();
  a.currentTime = t;
  update({ currentTime: t });
}

export function setVolume(v: number): void {
  const a = ensureElement();
  const clamped = Math.max(0, Math.min(1, v));
  a.volume = clamped;
  update({ volume: clamped });
}

export function setLoopMode(mode: LoopMode): void {
  const a = ensureElement();
  a.loop = mode === "inf";
  repeatsLeft = typeof mode === "number" ? mode : 0;
  update({ loopMode: mode });
}

export function stop(): void {
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
  update({ playing: false, currentTime: 0 });
}

/**
 * Put the player away entirely: stop, and forget what was loaded.
 *
 * Distinct from stop(), which rewinds but deliberately keeps the track
 * loaded so the anthem page's own controls still have something to resume.
 * The now-playing bar needs the other meaning, because it renders whenever
 * a track is loaded: dismissing it has to actually clear the track or the
 * bar simply sits there rewound and will not go away.
 */
export function unload(): void {
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
  }
  update({
    src: null,
    title: null,
    artist: null,
    art: null,
    artFallback: null,
    captions: null,
    rtl: false,
    playing: false,
    currentTime: 0,
    duration: 0,
    sleep: { kind: "off" },
  });
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getSnapshot(): AudioSnapshot {
  return snapshot;
}

/** The player outside React (1.7): the ambience lowers itself under a voice
 *  that is playing, and the sleep timer watches for the end of a track. */
export const subscribeAudio = subscribe;
export const getAudioSnapshot = getSnapshot;

// SSR: stable identity for `useSyncExternalStore` hydration safety.
const SERVER_SNAPSHOT: AudioSnapshot = {
  src: null,
  title: null,
  artist: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  loopMode: "off",
  art: null,
  artFallback: null,
  captions: null,
  rtl: false,
  rate: 1,
  sleep: { kind: "off" },
};
function getServerSnapshot(): AudioSnapshot {
  return SERVER_SNAPSHOT;
}

export function usePersistentAudio(): AudioSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
