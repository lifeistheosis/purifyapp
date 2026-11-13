"use client";

import type { DownloadableBible } from "@/lib/bible/downloads/catalog";
import { chapterKey, rememberAnchors, whenPageVerses } from "@/lib/listen/speech/pageText";
import { openVoiceSheet } from "@/lib/listen/speech/sheet";
import { speakText, voiceFor } from "@/lib/listen/speech/speak";
import { spokenBibleSrc, voiceLang } from "@/lib/listen/speech/spoken";
import { play, seek, setLoopMode, setTrack } from "@/lib/prayers/persistentAudioStore";
import { readSpeed } from "@/lib/player/speed";

import { hasReadAloud, readAloudManifest, readAloudSrc, verseCaptions } from "./chapters";
import { coverName, readAloudCover } from "./covers";
import { startOf, watchPlaces } from "./resume";

/**
 * Load a chapter's reading into the app's one player and play it (1.7):
 * Listen on the chapter's pill and in the computer's toolbar, a reading that
 * rolls on into the next chapter (components/bible/ReadAloud.tsx), and from
 * 1.8 the player's own previous and next (components/player/PlayerSteps.tsx).
 * It plays at the reader's speed, kept on the device (lib/player/speed.ts).
 *
 * Its cover is an icon of the book's saint or prophet, and the line under
 * the title names them (lib/readAloud/covers.ts).
 *
 * From 1.9 it begins where the reader stopped in that chapter, kept for each
 * book however the reading was stopped, the lock screen too
 * (lib/readAloud/resume.ts).
 */
export async function startReading(book: string, chapter: number, title: string, t: (key: string) => string): Promise<void> {
  const cover = readAloudCover(book);
  // Ask for the picture now, while the timings load, so Now Playing and the
  // lock screen have it when they open. In the apps it is the website's.
  if (typeof Image !== "undefined") {
    const warm = new Image();
    warm.decoding = "async";
    warm.src = cover.src;
  }
  const manifest = await readAloudManifest(book, chapter);
  setTrack(readAloudSrc(book, chapter), {
    title,
    // The saint or prophet on the cover, "St John the Theologian"; the plain
    // "Read aloud" where the cover is the manuscript plate.
    artist: coverName(cover, t) ?? t("readAloud.by"),
    art: cover.src,
    artFallback: cover.fallback,
    artSize: cover.size ?? undefined,
    captions: manifest ? verseCaptions(manifest) : undefined,
    rate: readSpeed(),
  });
  watchPlaces();
  // Set before it has loaded, this is where the recording begins once it has.
  const at = startOf(book, chapter);
  if (at > 0) seek(at);
  setLoopMode("off");
  play();
}

/**
 * Listen on a chapter (1.9, build 95 note 25, his "all recs" of 2026-11-13:
 * the phone's voices read the whole Bible, free for every reader). The voice
 * the reader chose for the chapter's language reads it: Heart, its recording,
 * where the English has one and no other voice is chosen; else the phone's
 * voice, reading the very words on the page, in the English or the Bible the
 * reader downloaded, the Old Testament too. Where the phone has no voice for
 * the language and there is no recording, the Voice sheet says so and where
 * one is added. What it did: "heart", "phone", "none", or "failed" (the page's
 * words were not at hand, or the device cannot speak after all).
 */
export async function listenToChapter(o: {
  book: string;
  chapter: number;
  title: string;
  t: (key: string) => string;
  /** The downloaded Bible the page shows the chapter in, or null for the English. */
  bible: DownloadableBible | null;
}): Promise<"heart" | "phone" | "none" | "failed"> {
  const recorded = !o.bible && hasReadAloud(o.book, o.chapter);
  const lang = o.bible ? voiceLang(o.bible.textLang) : "en";
  const use = await voiceFor(lang, recorded);
  if (use.kind === "heart") {
    await startReading(o.book, o.chapter, o.title, o.t);
    return "heart";
  }
  if (use.kind === "none") {
    openVoiceSheet({ none: { lang } });
    return "none";
  }
  // The page's own words: a page opening as a reading rolls on into it hands them over a moment later.
  const verses = await whenPageVerses(chapterKey(o.book, o.chapter, o.bible?.id ?? null), 8000);
  if (!verses?.length) return "failed";
  const cover = readAloudCover(o.book);
  const src = spokenBibleSrc(o.book, o.chapter, o.bible?.id ?? null);
  const ok = await speakText({
    src,
    pieces: verses.map((v) => ({ text: v.text, ...(typeof v.n === "number" ? { n: v.n } : {}) })),
    lang,
    voice: use.voice,
    title: o.title,
    artist: coverName(cover, o.t) ?? o.t("readAloud.by"),
    art: cover.src,
    artFallback: cover.fallback,
    artSize: cover.size ?? undefined,
    rtl: o.bible?.dir === "rtl",
  });
  if (!ok) return "failed";
  rememberAnchors(src, verses.map((v) => v.anchor));
  return "phone";
}
