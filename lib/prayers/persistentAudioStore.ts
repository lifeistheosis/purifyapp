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
 * Consumers:
 *  - `components/prayers/AudioPlayer.tsx` (the anthem player UI)
 *    renders against this store: no local audio ref, no local
 *    play/pause state.
 *  - Future "now playing" surfaces (e.g. a mini-player in the
 *    bottom-right when the user has navigated away) can subscribe
 *    to the same snapshot.
 */

export type LoopMode = "off" | "inf" | 3 | 7 | 12;

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
    if (repeatsLeft > 0) {
      repeatsLeft -= 1;
      a.currentTime = 0;
      void a.play();
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
        void a.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        a.pause();
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        a.pause();
        a.currentTime = 0;
        update({ playing: false, currentTime: 0 });
      });
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
  opts: { title?: string; artist?: string } = {},
): void {
  const a = ensureElement();
  const sameSrc = a.src.endsWith(src) || a.src === src;
  if (!sameSrc) {
    a.src = src;
    a.load();
    update({
      src,
      title: opts.title ?? null,
      artist: opts.artist ?? null,
      currentTime: 0,
      duration: 0,
    });
  } else {
    // Refresh metadata if the consumer passed new title/artist.
    update({
      src,
      title: opts.title ?? snapshot.title,
      artist: opts.artist ?? snapshot.artist,
    });
  }
  // MediaSession metadata for OS lock-screen controls.
  if ("mediaSession" in navigator && (opts.title || opts.artist)) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: opts.title ?? "",
        artist: opts.artist ?? "Purify",
        album: "Purify",
      });
    } catch {
      /* MediaMetadata unsupported on some browsers */
    }
  }
}

export function play(): void {
  const a = ensureElement();
  void a.play();
}

export function pause(): void {
  if (audioEl) audioEl.pause();
}

export function toggle(): void {
  const a = ensureElement();
  if (a.paused) void a.play();
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

/**
 * Briefly lower the playing audio, then restore it.
 *
 * For the prayer rope's bead tone. The rope runs its own AudioContext
 * oscillator with no knowledge of this store, so a bead struck during the
 * anthem used to sound straight over the chant at full volume. Ducking is
 * the right shape rather than pausing: the chant is meant to continue under
 * the bead, just out of the way of it.
 *
 * Deliberately does NOT go through setVolume, and deliberately does not
 * touch the snapshot: this is a transient dip, not a change to the reader's
 * chosen volume, and publishing it would make a volume slider twitch on
 * every bead. Overlapping ducks (a fast decade) extend the existing one
 * rather than stacking, so the restore always returns to the real level.
 */
let duckTimer: ReturnType<typeof setTimeout> | null = null;

export function duckFor(ms: number, factor = 0.25): void {
  if (typeof window === "undefined") return;
  if (!audioEl || audioEl.paused) return;
  const target = snapshot.volume;
  audioEl.volume = Math.max(0, Math.min(1, target * factor));
  if (duckTimer) clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    duckTimer = null;
    // Read the snapshot again rather than closing over `target`: the reader
    // may have moved the slider while the duck was running.
    if (audioEl) audioEl.volume = snapshot.volume;
  }, ms);
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
    playing: false,
    currentTime: 0,
    duration: 0,
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
};
function getServerSnapshot(): AudioSnapshot {
  return SERVER_SNAPSHOT;
}

export function usePersistentAudio(): AudioSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
