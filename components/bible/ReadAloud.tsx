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
import type { DownloadableBible } from "@/lib/bible/downloads/catalog";
import { anchorsOf } from "@/lib/listen/speech/pageText";
import { onSpokenEnd } from "@/lib/listen/speech/speak";
import { spokenBibleSrc, spokenOf } from "@/lib/listen/speech/spoken";
import { useCanSpeak } from "@/lib/listen/speech/voices";
import { captionLines, lineAt } from "@/lib/player/captions";
import { hasReadAloud, readAloudManifest, readingOfSrc, useHasReadAloud, verseAt, type ReadAloudManifest } from "@/lib/readAloud/chapters";
import { listenToChapter } from "@/lib/readAloud/play";
import { askToListenAt, takeListenAsk } from "@/lib/readAloud/rollOn";
import { currentTimeNow, getAudioSnapshot, pause, play, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
import { cn } from "@/lib/cn";
import { goToReadingPlace, inReadingZone, visibleBand } from "@/lib/ui/readingPlace";

import { ReaderPill } from "./ReaderPill";

/** After the reader scrolls, the reading lets them look for this long. */
const HANDS_OFF_MS = 4000;

/**
 * Whether the player holds this chapter, in the Bible the page shows it in.
 * The recording (the English) by the chapter it reads, not by its address
 * (1.9): the address changes when the chapter is saved to the phone while it
 * plays (the week's readings can save today's on opening,
 * lib/readAloud/week.ts), and by address the page then lost it, Listen
 * offered again, the verse no longer following the voice, and no rolling on
 * into the next chapter. The phone's voice (1.9, build 95 note 25) by its
 * spoken address, which names the Bible too (lib/listen/speech/spoken.ts).
 */
function useThisChapter(book: string, chapter: number, bible: string | null = null) {
  const audio = usePersistentAudio();
  const reading = readingOfSrc(audio.src);
  const said = spokenOf(audio.src);
  const spoken = said?.kind === "bible" && said.book === book && said.chapter === chapter && said.bible === bible;
  const loaded = spoken || (!bible && reading?.book === book && reading.chapter === chapter);
  return { audio, loaded, spoken, playing: loaded && audio.playing };
}

/**
 * Whether a chapter can be listened to (1.9, build 95 note 25): the English
 * where it has its recording, and every chapter, in the English or a Bible the
 * reader downloaded, where the device can speak (the phone's voices, free for
 * every reader, his "all recs" of 2026-11-13).
 */
function useListens(book: string, chapter: number, bible: DownloadableBible | null): boolean {
  const recorded = useHasReadAloud(book, chapter);
  const speaks = useCanSpeak();
  return bible ? speaks : recorded || speaks;
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
export function ListenButton({ book, chapter, bookName, bible = null }: { book: string; chapter: number; bookName: string; bible?: DownloadableBible | null }) {
  const { t } = useTranslate();
  const { loaded, playing } = useThisChapter(book, chapter, bible?.id ?? null);
  const [busy, setBusy] = useState(false);
  const available = useListens(book, chapter, bible);
  if (!available) return null;

  const start = async () => {
    if (loaded) {
      if (playing) pause();
      else play();
      return;
    }
    setBusy(true);
    await listenToChapter({ book, chapter, title: `${t(`bible.books.${book}`) || bookName} ${chapter}`, t, bible });
    setBusy(false);
  };

  return (
    // The word on it says what a tap does, so it carries no pressed state.
    // What the release's tour lights for the New Testament read aloud (lib/whatsNew/tour.ts).
    <ReaderPill onClick={start} className="shrink-0" data-tour="listen">
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
 * is still the word. So it does on any phone where the name needs the room
 * to be shown whole (`wordGivesWay`, measured by the pill). A little shorter
 * than the pill it ends, with a 44px touch box.
 */
export function ReadAloudPillButton({
  book,
  chapter,
  title,
  wordGivesWay = false,
  bible = null,
}: {
  book: string;
  chapter: number;
  title: string;
  wordGivesWay?: boolean;
  /** The downloaded Bible the page shows the chapter in: the phone's voice reads it (1.9). */
  bible?: DownloadableBible | null;
}) {
  const { t } = useTranslate();
  const { loaded, playing } = useThisChapter(book, chapter, bible?.id ?? null);
  const [busy, setBusy] = useState(false);
  const available = useListens(book, chapter, bible);
  if (!available) return null;

  const toggle = async () => {
    if (loaded) {
      if (playing) pause();
      else play();
      return;
    }
    setBusy(true);
    await listenToChapter({ book, chapter, title, t, bible });
    setBusy(false);
  };

  const word = playing ? t("readAloud.pause") : t("readAloud.listen");
  return (
    <button
      type="button"
      data-read-aloud-play
      // What the release's tour lights for the New Testament read aloud (lib/whatsNew/tour.ts).
      data-tour="listen"
      onClick={toggle}
      aria-label={word}
      className="reader-lit tap-press hit-44 ms-1 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-paper px-3 font-sans text-ui font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper min-[390px]:px-4"
    >
      {playing ? (
        <Pause size={14} className="shrink-0" />
      ) : (
        <Play size={14} className={cn("shrink-0", busy && "motion-safe:animate-pulse")} />
      )}
      <span aria-hidden className={cn("max-[390px]:hidden group-data-[fit=1]:hidden", wordGivesWay && "hidden")}>
        {word}
      </span>
    </button>
  );
}

/**
 * Lights the verse being read and keeps it at the reading place. Draws
 * nothing itself.
 *
 * Kept in the middle of what the reader can see, between the round buttons
 * and the pill, the mini player and the tab bar (lib/ui/readingPlace.ts). It
 * was kept between 90px and 72% of the WINDOW and centred in the window, so
 * the verse being read sank to just over the pill, the mini player and the
 * tab bar before it moved, and moved to a middle a quarter of which they
 * cover (the owner's photo of Colossians 4 on build 81, verse 7 being read
 * low on the screen). Now it is moved back to the reading place once it
 * leaves the band's middle, and left alone for a while after the reader
 * scrolls.
 */
export function ReadAloudFollow({ book, chapter, bible = null }: { book: string; chapter: number; bible?: DownloadableBible | null }) {
  const { t } = useTranslate();
  const router = useRouter();
  const bibleId = bible?.id ?? null;
  const { audio, loaded, spoken, playing } = useThisChapter(book, chapter, bibleId);
  const manifest = useRef<ReadAloudManifest | null>(null);
  const lastHand = useRef(0);
  // The website's list can name this chapter after the screen opened (in the apps): the effects below run again then.
  const available = useListens(book, chapter, bible);
  const recorded = useHasReadAloud(book, chapter) && !bible;

  // Arriving from a reading that ended, or the player's next or previous: this chapter's reading goes on, read as it is read here.
  useEffect(() => {
    if (!available || !takeListenAsk(book, chapter)) return;
    void listenToChapter({ book, chapter, title: `${t(`bible.books.${book}`)} ${chapter}`, t, bible });
  }, [book, chapter, t, available, bible]);

  // The reading ended at its last verse: on into the next chapter, if it has
  // one. A recording, where the next has one; the phone's voice, always, read
  // in the Bible the reader reads (told by the voice's own end, since its clock
  // does not stop exactly at its length).
  const ended = loaded && !spoken && !audio.playing && audio.duration > 0 && audio.currentTime >= audio.duration - 0.3;
  useEffect(() => {
    if (!ended) return;
    const next = nextChapter(book, chapter);
    if (!next || !hasReadAloud(next.slug, next.chapter)) return;
    if (!askToListenAt(next.slug, next.chapter)) return;
    router.push(`/bible/${next.slug}/${next.chapter}`);
  }, [ended, book, chapter, router]);
  useEffect(
    () =>
      onSpokenEnd((src) => {
        if (src !== spokenBibleSrc(book, chapter, bibleId)) return;
        const next = nextChapter(book, chapter);
        if (!next || !askToListenAt(next.slug, next.chapter)) return;
        router.push(`/bible/${next.slug}/${next.chapter}`);
      }),
    [book, chapter, bibleId, router],
  );

  useEffect(() => {
    if (!recorded) return;
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
  }, [book, chapter, recorded]);

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
        const band = visibleBand();
        if (!inReadingZone(band, el.getBoundingClientRect())) goToReadingPlace(el, { band });
      }
    };
    const loop = () => {
      if (spoken) {
        // The phone's voice: the verse it is on, by the player's own lines,
        // lit where it stands on the page (a downloaded Bible's places are its own).
        const s = getAudioSnapshot();
        const at = s.captions?.length ? lineAt(captionLines(s.captions, s.duration), currentTimeNow()) : -1;
        const place = at >= 0 ? (anchorsOf(s.src)?.[at] ?? (typeof s.captions?.[at]?.n === "number" ? `v${s.captions[at].n}` : undefined)) : undefined;
        light(place ? document.getElementById(place) : null);
      } else {
        const m = manifest.current;
        if (m) {
          const n = verseAt(m, currentTimeNow());
          light(n ? document.getElementById(`v${n}`) : null);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      light(null);
    };
  }, [playing, spoken]);

  return null;
}
