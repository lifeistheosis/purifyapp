"use client";

import { useSyncExternalStore } from "react";

import { readSpeed } from "@/lib/player/speed";
import { getAudioSnapshot, play, seek, setLoopMode, setSpokenTrack } from "@/lib/prayers/persistentAudioStore";

import { speechEngine, type PhoneVoice } from "./engine";
import { createSpeechSession } from "./session";
import { DEFAULT_PACE, speechTimeline, type SpeechPiece } from "./timeline";
import { HEART, chosenVoice, goneSaid, markGoneSaid, voiceToUse, type VoiceToUse } from "./voiceChoice";
import { deviceVoices } from "./voices";

/**
 * A text read by the phone's voice, through the one player (1.9, build 95
 * note 25): which voice reads it, as the reader chose; the reading loaded and
 * begun; each voice's pace kept for next time; and what the player shows
 * about the voice (its name on the Voice row, the line said once when a
 * chosen voice has gone).
 */

const PACE_KEY = "purify:listen.pace";

function paces(): Record<string, number> {
  try {
    const kept = JSON.parse(window.localStorage.getItem(PACE_KEY) ?? "{}");
    return kept && typeof kept === "object" ? (kept as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** A voice's pace as learned from its last reading (letters a second at speed 1), or an ordinary one. */
export function paceOf(voiceId: string): number {
  const p = paces()[voiceId];
  return typeof p === "number" && Number.isFinite(p) && p > 0 ? p : DEFAULT_PACE;
}

/** Keep a voice's pace on the device (the session reports it as it learns it), for the next reading's timeline. */
export function keepPace(voiceId: string, pace: number): void {
  if (!(pace > 0)) return;
  try {
    const all = paces();
    // A few dozen voices at most: the newest kept.
    const ids = Object.keys(all).filter((id) => id !== voiceId).slice(-39);
    const next: Record<string, number> = {};
    for (const id of ids) next[id] = all[id];
    next[voiceId] = Math.round(pace * 100) / 100;
    window.localStorage.setItem(PACE_KEY, JSON.stringify(next));
  } catch {
    /* a full or private store: learned again next time */
  }
}

type Shown = {
  /** The spoken track and the voice reading it. */
  reading: { src: string; voice: PhoneVoice } | null;
  /** A chosen voice had gone and another reads: said once, by the player. */
  gone: { lang: string; instead: "heart" | PhoneVoice } | null;
};

/** Told when a spoken track has been read to its end and stops there (not a Loop's new round): a chapter rolls on into the next. */
const endListeners = new Set<(src: string) => void>();

export function onSpokenEnd(listener: (src: string) => void): () => void {
  endListeners.add(listener);
  return () => {
    endListeners.delete(listener);
  };
}

let shown: Shown = { reading: null, gone: null };
const listeners = new Set<() => void>();

function set(patch: Partial<Shown>): void {
  shown = { ...shown, ...patch };
  for (const l of listeners) l();
}

/** What the player shows of the voice: the one reading, and a line said once. */
export function useVoiceShown(): Shown {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => shown,
    () => shown,
  );
}

/** The line about a gone voice has been shown: it is not shown again. */
export function goneShown(): void {
  if (shown.gone) set({ gone: null });
}

/**
 * Which voice reads a text in `lang` (a voice's language, lib/listen/speech/
 * spoken.ts voiceLang): the reader's choice where the phone still has it, else
 * Heart where the text has its recording, else the phone's own voice for the
 * language; none where the phone has no voice for it and there is no
 * recording. A text with its recording, and no other voice chosen for its
 * language, is Heart without waking the phone's speech at all.
 */
export async function voiceFor(lang: string, recorded: boolean): Promise<VoiceToUse> {
  const choice = chosenVoice(lang);
  if (recorded && (!choice || choice === HEART)) return { kind: "heart" };
  const use = voiceToUse(choice, await deviceVoices(), lang, recorded);
  if (use.kind !== "none" && use.gone && !goneSaid(use.gone)) {
    markGoneSaid(use.gone);
    set({ gone: { lang, instead: use.kind === "heart" ? "heart" : use.voice } });
  }
  return use;
}

export type SpeakText = {
  /** Its address in the player (lib/listen/speech/spoken.ts). */
  src: string;
  pieces: SpeechPiece[];
  /** The voice's language. */
  lang: string;
  voice: PhoneVoice;
  title: string;
  artist?: string;
  art?: string;
  artFallback?: string;
  artSize?: string;
  rtl?: boolean;
  /** The piece to begin at: the verse being read when the voice is changed. */
  from?: number;
  /** Begin speaking at once (the default), or load it paused there. */
  autoplay?: boolean;
};

/**
 * Load a text for the phone's voice into the one player and read it. False
 * where the device has no speech after all.
 */
export async function speakText(o: SpeakText): Promise<boolean> {
  const engine = await speechEngine();
  if (!engine || !o.pieces.length) return false;
  const pace = paceOf(o.voice.id);
  const rate = readSpeed();
  const t = speechTimeline(o.pieces, pace);
  setSpokenTrack(
    o.src,
    (host) =>
      createSpeechSession({
        engine,
        pieces: o.pieces,
        lang: o.voice.lang || o.lang,
        voice: o.voice.id,
        rate,
        volume: getAudioSnapshot().volume,
        pace,
        onPace: (p) => keepPace(o.voice.id, p),
        title: o.title,
        artist: o.artist,
        host: {
          ...host,
          ended: (restart) => {
            host.ended(restart);
            // Stopped at its end, not begun again by a Loop or a repeat.
            if (!getAudioSnapshot().playing && getAudioSnapshot().src === o.src) for (const l of [...endListeners]) l(o.src);
          },
        },
      }),
    {
      title: o.title,
      artist: o.artist,
      art: o.art,
      artFallback: o.artFallback,
      artSize: o.artSize,
      captions: t.captions,
      duration: t.duration,
      rtl: o.rtl,
      rate,
    },
  );
  set({ reading: { src: o.src, voice: o.voice } });
  const from = Math.max(0, Math.min(o.from ?? 0, t.starts.length - 1));
  if (from > 0) seek(t.starts[from]);
  setLoopMode("off");
  if (o.autoplay !== false) play();
  return true;
}
