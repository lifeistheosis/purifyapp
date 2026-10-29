"use client";

import { play, setLoopMode, setTrack } from "@/lib/prayers/persistentAudioStore";
import { readSpeed } from "@/lib/player/speed";

import { readAloudManifest, readAloudSrc, verseCaptions } from "./chapters";
import { readAloudCover } from "./covers";

/**
 * Load a chapter's reading into the app's one player and play it (1.7):
 * Listen on the chapter's pill and in the computer's toolbar, a reading that
 * rolls on into the next chapter (components/bible/ReadAloud.tsx), and from
 * 1.8 the player's own previous and next (components/player/PlayerSteps.tsx).
 * It plays at the reader's speed, kept on the device (lib/player/speed.ts).
 *
 * Its cover is an icon of the book's saint or prophet, and the line under
 * the title names them (lib/readAloud/covers.ts).
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
    artist: cover.nameKey ? t(cover.nameKey) : t("readAloud.by"),
    art: cover.src,
    artFallback: cover.fallback,
    artSize: cover.size ?? undefined,
    captions: manifest ? verseCaptions(manifest) : undefined,
    rate: readSpeed(),
  });
  setLoopMode("off");
  play();
}
