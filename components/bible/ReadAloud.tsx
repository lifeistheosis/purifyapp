"use client";

// Read-aloud with follow-along (1.7, the owner's "Do all of these" of
// 2026-10-15). On a chapter that has a reading, Listen (at the end of the
// chapter's pill on a phone, in the toolbar on a computer, from 1.8) plays
// it through the app's one player (the mini player and Now
// Playing show it, the verses as live captions), and while it plays the
// verse being read is lit in the chapter and kept in view, unless the reader
// has just scrolled away to look at something else. lib/readAloud/chapters.ts
// says which chapters have a reading.
//
// Its cover is an icon of the book's saint or prophet, and the line under
// the title names them (the owner's note 9 of 2026-10-16 and his answer:
// every book, the Old Testament too). lib/readAloud/covers.ts says whose.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Headphones } from "@/components/ui/icons/Headphones";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { nextChapter } from "@/lib/bible/books";
import { hasReadAloud, readAloudManifest, readAloudSrc, useHasReadAloud, verseAt, verseCaptions, type ReadAloudManifest } from "@/lib/readAloud/chapters";
import { readAloudCover } from "@/lib/readAloud/covers";
import { currentTimeNow, pause, play, setLoopMode, setTrack, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
import { cn } from "@/lib/cn";

import { ReaderPill } from "./ReaderPill";

/** After the reader scrolls, the reading lets them look for this long. */
const HANDS_OFF_MS = 4000;
/** The chapter a reading that just ended rolls on into. */
const NEXT_KEY = "purify:readAloud.next";

/** Load a chapter's reading into the player and play it. */
async function startReading(book: string, chapter: number, title: string, t: (key: string) => string): Promise<void> {
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
  });
  setLoopMode("off");
  play();
}

function useThisChapter(book: string, chapter: number) {
  const audio = usePersistentAudio();
  const src = readAloudSrc(book, chapter);
  const loaded = Boolean(audio.src && audio.src.endsWith(src));
  return { audio, src, loaded, playing: loaded && audio.playing };
}

/**
 * Listen, in the computer's toolbar, beside the sound (1.8). It stood at the
 * end of the chapter title's line from 1.7 (the owner's note 4 of
 * 2026-10-16); the title is now the opening of the page, the book's name
 * over its chapter (his pick B of round 2), and on a phone and a tablet
 * Listen ends the pill at the foot (ReadAloudPillButton). The reader's pill,
 * so it stands at the height of the toolbar's others: headphones and Listen,
 * the pause bars and Pause while it plays, and a play mark once it is paused.
 */
export function ListenButton({ book, chapter, bookName }: { book: string; chapter: number; bookName: string }) {
  const { t } = useTranslate();
  const { loaded, playing } = useThisChapter(book, chapter);
  const [busy, setBusy] = useState(false);
  const available = useHasReadAloud(book, chapter);
  if (!available) return null;

  const start = async () => {
    if (loaded) {
      if (playing) pause();
      else play();
      return;
    }
    setBusy(true);
    await startReading(book, chapter, `${t(`bible.books.${book}`) || bookName} ${chapter}`, t);
    setBusy(false);
  };

  return (
    // The word on it says what a tap does, so it carries no pressed state.
    <ReaderPill onClick={start} className="shrink-0">
      {playing ? (
        <Pause size={15} className="shrink-0" />
      ) : loaded ? (
        <Play size={15} className="shrink-0" />
      ) : (
        <Headphones size={16} className="shrink-0" />
      )}
      <span className={busy ? "motion-safe:animate-pulse" : undefined}>{playing ? t("readAloud.pause") : t("readAloud.listen")}</span>
    </ReaderPill>
  );
}

/**
 * Listen, on the chapter pill at the foot of the screen (1.8, the owner's
 * pick B of round 2, "The page": "The floating pill comes back when you
 * scroll up, with Listen"). It was a play mark beside the sound button from
 * 1.7.1 (the owner: "add it right next to the volume"); now it ends the pill,
 * white and softly lit, the word on it saying what a tap does: Listen, Pause
 * while it plays, Listen again once paused. The same reading as Listen in the
 * computer's toolbar, through the same player, the verse being read lit as it
 * is read (ReadAloudFollow). Drawn only where the chapter has a reading: on
 * any other the pill is its arrows, its name and the sound button, and no
 * button stands there that does nothing. On the narrowest phones the word
 * gives its room to the chapter's name and the mark stands alone; its name
 * is still the word. A little shorter than the pill it ends, with a 44px
 * touch box.
 */
export function ReadAloudPillButton({ book, chapter, title }: { book: string; chapter: number; title: string }) {
  const { t } = useTranslate();
  const { loaded, playing } = useThisChapter(book, chapter);
  const [busy, setBusy] = useState(false);
  const available = useHasReadAloud(book, chapter);
  if (!available) return null;

  const toggle = async () => {
    if (loaded) {
      if (playing) pause();
      else play();
      return;
    }
    setBusy(true);
    await startReading(book, chapter, title, t);
    setBusy(false);
  };

  const word = playing ? t("readAloud.pause") : t("readAloud.listen");
  return (
    <button
      type="button"
      data-read-aloud-play
      onClick={toggle}
      aria-label={word}
      className="reader-lit tap-press hit-44 ms-1 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-paper px-3 font-sans text-ui font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper min-[390px]:px-4"
    >
      {playing ? (
        <Pause size={14} className="shrink-0" />
      ) : (
        <Play size={14} className={cn("shrink-0", busy && "motion-safe:animate-pulse")} />
      )}
      <span aria-hidden className="max-[390px]:hidden">
        {word}
      </span>
    </button>
  );
}

/** Lights the verse being read and keeps it in view. Draws nothing itself. */
export function ReadAloudFollow({ book, chapter }: { book: string; chapter: number }) {
  const { t } = useTranslate();
  const router = useRouter();
  const { audio, loaded, playing } = useThisChapter(book, chapter);
  const manifest = useRef<ReadAloudManifest | null>(null);
  const lastHand = useRef(0);
  // The website's list can name this chapter after the screen opened (in the apps): the effects below run again then.
  const available = useHasReadAloud(book, chapter);

  // Arriving from a reading that ended: this chapter's reading goes on.
  useEffect(() => {
    let waiting: string | null = null;
    try {
      waiting = window.sessionStorage.getItem(NEXT_KEY);
      if (waiting === `${book}/${chapter}`) window.sessionStorage.removeItem(NEXT_KEY);
    } catch {
      return;
    }
    if (waiting === `${book}/${chapter}` && available) {
      void startReading(book, chapter, `${t(`bible.books.${book}`)} ${chapter}`, t);
    }
  }, [book, chapter, t, available]);

  // The reading ended at its last verse: on into the next chapter, if it has one.
  const ended = loaded && !audio.playing && audio.duration > 0 && audio.currentTime >= audio.duration - 0.3;
  useEffect(() => {
    if (!ended) return;
    const next = nextChapter(book, chapter);
    if (!next || !hasReadAloud(next.slug, next.chapter)) return;
    try {
      window.sessionStorage.setItem(NEXT_KEY, `${next.slug}/${next.chapter}`);
    } catch {
      return;
    }
    router.push(`/bible/${next.slug}/${next.chapter}`);
  }, [ended, book, chapter, router]);

  useEffect(() => {
    if (!available) return;
    let alive = true;
    void readAloudManifest(book, chapter).then((m) => {
      if (alive) manifest.current = m;
    });
    const hand = () => {
      lastHand.current = performance.now();
    };
    window.addEventListener("wheel", hand, { passive: true });
    window.addEventListener("touchmove", hand, { passive: true });
    return () => {
      alive = false;
      window.removeEventListener("wheel", hand);
      window.removeEventListener("touchmove", hand);
    };
  }, [book, chapter, available]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let lit: HTMLElement | null = null;
    // The verse being read keeps its full strength and the rest of the
    // chapter steps back, as lyrics do in a music player (app/globals.css,
    // "Read aloud"). The boxed, striped highlight it replaced was called
    // vibe coded by the owner (2026-10-16).
    const root = document.documentElement;
    const light = (el: HTMLElement | null) => {
      if (lit === el) return;
      if (lit) delete lit.dataset.readNow;
      lit = el;
      if (!el) {
        delete root.dataset.readAloud;
        return;
      }
      el.dataset.readNow = "";
      root.dataset.readAloud = "";
      if (performance.now() - lastHand.current > HANDS_OFF_MS) {
        const r = el.getBoundingClientRect();
        if (r.top < 90 || r.bottom > window.innerHeight * 0.72) {
          el.scrollIntoView({ block: "center", behavior: document.documentElement.dataset.motion === "reduce" ? "auto" : "smooth" });
        }
      }
    };
    const loop = () => {
      const m = manifest.current;
      if (m) {
        const n = verseAt(m, currentTimeNow());
        light(n ? document.getElementById(`v${n}`) : null);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      light(null);
    };
  }, [playing]);

  return null;
}
