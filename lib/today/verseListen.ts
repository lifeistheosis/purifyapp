"use client";

import { useState, useSyncExternalStore } from "react";

import { getAudioSnapshot, pause, play, subscribeAudio } from "@/lib/prayers/persistentAudioStore";
import { readAloudSrc, useHasReadAloud } from "@/lib/readAloud/chapters";
import { listeningPlace, startListening, subscribeListening, type ListenPart, type ListenStart } from "@/lib/readings/listen";

/**
 * Listen on the Verse of the Day (1.8, the owner's pick B of round 10, "The
 * light"): just the day's verse, read aloud. It is cut out of its chapter's
 * recording by the verse's own timings (lib/readAloud/chapters.ts, the
 * timings the website keeps beside each chapter), from where the verse
 * starts to where it ends, and stops there. It plays through the app's one
 * player, the way today's readings are heard (lib/readings/listen.ts), so the
 * mini player and the lock screen show it, and anything else put on ends it.
 *
 * Only where that chapter has a recording, the New Testament today: on any
 * other verse the card has no Listen at all.
 */
export type VerseAt = { book: string; chapter: number; verse: number };

/** The verse alone, as a span to hear: from its first word to its last, and nothing either side. */
export function verseListenPart(at: VerseAt, title: string, artist: string): ListenPart {
  return { book: at.book, chapter: at.chapter, from: at.verse, to: at.verse, title, artist };
}

/** Hear the verse: its chapter's recording, from the verse's start to its end. */
export function listenToVerse(at: VerseAt, title: string, artist: string): Promise<ListenStart> {
  return startListening([verseListenPart(at, title, artist)]);
}

/**
 * Listen for a card: whether there is a recording to hear (the button is
 * drawn only then), whether this verse is the one being heard now, and the
 * tap: hear it, pause it, or go on from the pause. The tap answers whether
 * the verse could be heard: false when its timings could not be read (no
 * connection, and the book not saved), for the card to say so (1.9).
 */
export function useVerseListen(at: VerseAt | null, title: string, artist: string): { available: boolean; playing: boolean; toggle: () => Promise<boolean> } {
  const has = useHasReadAloud(at?.book ?? "", at?.chapter ?? 0);
  const src = at ? readAloudSrc(at.book, at.chapter) : null;
  // Whether this card started what is heard: today's readings can play the same chapter.
  const [started, setStarted] = useState(false);
  const heard = useSyncExternalStore(
    subscribeListening,
    () => Boolean(src) && listeningPlace()?.src === src,
    () => false,
  );
  const sounding = useSyncExternalStore(
    subscribeAudio,
    () => {
      const now = getAudioSnapshot();
      return Boolean(src) && now.playing && now.src === src;
    },
    () => false,
  );
  const ours = started && heard;
  return {
    available: Boolean(at) && has,
    playing: ours && sounding,
    toggle: async () => {
      if (!at) return true;
      if (ours && sounding) {
        pause();
        return true;
      }
      if (ours) {
        play();
        return true;
      }
      setStarted(true);
      const came = await listenToVerse(at, title, artist);
      if (came === "unheard") setStarted(false);
      return came !== "unheard";
    },
  };
}
