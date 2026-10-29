"use client";

import { openNowPlaying } from "@/lib/player/sheet";
import type { CaptionSource } from "@/lib/prayers/persistentAudioStore";
import { currentSrc, play, setLoopMode, setTrack, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

import { captionsFor, chantMediaUrl, loadTiming, type WordsPrefs } from "./media";
import type { ChantIndexVariant, ChantLine, ChantTiming } from "./types";

/**
 * Play one recording of a chant through the app's one player (1.7): the mini
 * player above the tabs, Now Playing, the lock screen. Used by a chant's page
 * and by Pray with chant.
 *
 * Called from the tap itself, and only for a recording the live list says may
 * play (lib/chants/live.ts): a phone lets a page start sound only in answer
 * to a touch, and an await before play() can lose that. So the recording
 * starts at once, and its timed words follow when the timing file arrives
 * (usually at once too: a chant's page asks for it as it opens).
 */
export type PlayRequest = {
  slug: string;
  /** The chant's name in the reader's language. */
  title: string;
  variant: ChantIndexVariant;
  /** The words, when the caller has them (a chant's page). */
  lines?: ChantLine[];
  coverSrc?: string;
  prefs: WordsPrefs;
  /** Round and round until stopped: Pray with chant, under a prayer. */
  loop?: boolean;
  /** Open Now Playing on its words. A chant's page, which lights the words
   *  itself, keeps the page (1.8). */
  open?: boolean;
};

/**
 * Who sings it. Never "Purify" for a recording Purify did not make: the
 * performer when known, else the version's own name ("Français").
 */
export function artistOf(variant: Pick<ChantIndexVariant, "performer" | "label" | "setting">): string {
  if (variant.performer) return variant.performer;
  return [variant.setting, variant.label].filter(Boolean).join(" · ");
}

/** Captions from the timing file alone: its words are the Church's, held line for line by the data test. */
export function captionsFromTiming(timing: ChantTiming): CaptionSource {
  return timing.lines.map((l) => ({ time: l.at, end: l.end, text: l.text }));
}

export function playChant(req: PlayRequest): void {
  const src = chantMediaUrl(req.variant.audio.src);
  const meta = {
    title: req.title,
    artist: artistOf(req.variant),
    art: req.coverSrc ? chantMediaUrl(req.coverSrc) : undefined,
    rtl: Boolean(req.variant.rtl),
    // A sung chant is never sped up (1.8): always as recorded, whatever the
    // read-aloud's speed (lib/player/speed.ts).
    rate: 1,
  };
  setTrack(src, meta);
  if (req.loop) setLoopMode("inf");
  play();
  if (req.open) openNowPlaying({ view: "words" });

  if (!req.variant.timing) return;
  void loadTiming(req.variant.timing).then((timing) => {
    // Gone, or another recording chosen since the tap: nothing to hand over.
    if (!timing || currentSrc() !== src) return;
    const captions = req.lines ? captionsFor(req.lines, timing, req.prefs) : captionsFromTiming(timing);
    // Still the same recording: setTrack with the same address keeps the
    // playback where it is and only hands over the words.
    setTrack(src, { ...meta, captions });
  });
}

/** Ask for a recording's timing file ahead of the tap. */
export function warmTiming(variant: Pick<ChantIndexVariant, "timing">): void {
  if (variant.timing) void loadTiming(variant.timing);
}

/**
 * Whether this recording is the one in the player, and whether it is
 * sounding: for a Play that turns to Pause, and words that light as they
 * are sung.
 */
export function useChantPlayback(variant: Pick<ChantIndexVariant, "audio"> | null): {
  loaded: boolean;
  playing: boolean;
  position: number;
} {
  const audio = usePersistentAudio();
  if (!variant || !audio.src) return { loaded: false, playing: false, position: 0 };
  const src = chantMediaUrl(variant.audio.src);
  const loaded = audio.src === src || audio.src.endsWith(variant.audio.src);
  return { loaded, playing: loaded && audio.playing, position: loaded ? audio.currentTime : 0 };
}
