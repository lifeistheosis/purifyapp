"use client";

import { useEffect, useSyncExternalStore } from "react";

import { canSpeak, speechEngine, type PhoneVoice } from "./engine";
import { voicesFor } from "./voiceChoice";

/**
 * The voices this phone has, asked once and kept for the life of the page
 * (1.9, build 95 note 25). Asking wakes the phone's speech engine, so it is
 * asked when the player or a Listen needs it, never as the app opens. Asked
 * again when the Voice sheet opens and when the reader comes back to the app
 * (a voice added in the phone's settings meanwhile); the list known stands
 * until the new one comes.
 */

let known: PhoneVoice[] | null = null;
let asking: Promise<PhoneVoice[]> | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  for (const l of listeners) l();
}

/** The phone's voices: those known, or asked for now. Empty where the device has no speech. */
export function deviceVoices(): Promise<PhoneVoice[]> {
  if (known) return Promise.resolve(known);
  return askAgain();
}

/** Ask the phone again, keeping the list known until it answers. */
export function askAgain(): Promise<PhoneVoice[]> {
  asking ??= speechEngine()
    .then((engine) => (engine ? engine.voices() : []))
    .catch(() => [] as PhoneVoice[])
    .then((voices) => {
      asking = null;
      known = voices;
      tell();
      return voices;
    });
  return asking;
}

/** The phone's voices for a component: null until first known. `ask` wakes the phone's speech to know them. */
export function useDeviceVoices(ask = true): PhoneVoice[] | null {
  const voices = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => known,
    () => null,
  );
  useEffect(() => {
    if (ask) void deviceVoices();
  }, [ask]);
  return voices;
}

const never = () => () => {};

/**
 * Whether Listen can be offered on a text with no recording: the device can
 * speak. Drawn as true on the server, so a page drawn there does not move when
 * it wakes; a browser with no speech takes it away.
 */
export function useCanSpeak(): boolean {
  return useSyncExternalStore(never, canSpeak, () => true);
}

/** For tests. */
export function forgetDeviceVoices(): void {
  known = null;
  asking = null;
}

/** A phone's own name for a voice that is an id, not a name: Android's "en-gb-x-gba-local". */
function isAnId(voice: PhoneVoice): boolean {
  return voice.name === voice.id && !/\s/.test(voice.name) && /[-_#.]/.test(voice.name);
}

export type VoiceRow = { voice: PhoneVoice; name: string; language: string };

/**
 * The phone's voices for a language as the Voice sheet lists them, each with
 * the name a reader sees and its language in the reader's own words: an
 * iPhone's own names (Daniel, Samantha); a browser's, without the language it
 * adds after a dash ("Microsoft David - English (United States)"); Android's
 * ids, by their language and a number ("Voice 2"). A voice listed twice under
 * one name (an iPhone's compact and enhanced Daniel) is listed once, the
 * better, or the one the reader chose.
 */
export function voiceRows(voices: readonly PhoneVoice[], lang: string, locale: string, numbered: (n: number) => string, chosen: string | null = null): VoiceRow[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: "language" });
  } catch {
    names = null;
  }
  const languageOf = (tag: string) => {
    try {
      return names?.of(tag.replace("_", "-")) ?? tag;
    } catch {
      return tag;
    }
  };
  const counts = new Map<string, number>();
  const rows: VoiceRow[] = [];
  const seen = new Map<string, number>();
  for (const voice of voicesFor(voices, lang)) {
    const tag = voice.lang.toLowerCase().replace("_", "-");
    let name: string;
    if (isAnId(voice)) {
      const n = (counts.get(tag) ?? 0) + 1;
      counts.set(tag, n);
      name = numbered(n);
    } else {
      name = voice.name.split(" - ")[0].trim() || voice.name;
    }
    const row = { voice, name, language: languageOf(voice.lang) };
    const twin = `${tag}|${name}`;
    const at = seen.get(twin);
    if (at === undefined) {
      seen.set(twin, rows.length);
      rows.push(row);
      continue;
    }
    // The twin listed already: keep the reader's choice, else the better.
    const before = rows[at].voice;
    if (before.id !== chosen && (voice.id === chosen || (voice.quality ?? 0) > (before.quality ?? 0))) rows[at] = row;
  }
  return rows;
}
