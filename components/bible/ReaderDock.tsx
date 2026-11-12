"use client";

// The reader's dock (1.9): on a phone and a tablet, while anything is loaded
// in the app's one player, the chapter's pill and the player are one card.
//
// Until 1.9 the chapter's pill (MobileChapterPill) floated over the mini
// player (components/prayers/NowPlayingBar.tsx), two bars one over the
// other at the foot of the page for as long as anything played (bug 5 of
// the 1.9 walk through Plus). The owner's pick for Listening, "one bar while
// playing", of 2026-11-06: "B, but when you scroll, it turns into C"
// (docs/1.9-build/BRAINSTORM.md). So:
//
//  - B, at rest (the top of the chapter, or after a scroll up): one card in
//    two rows. The player above it, the cover, the title over how far it has
//    played, and Play or Pause; the chapter below it, its arrows and its
//    name, then Speed (a chapter read aloud only, as in Now Playing: a chant
//    is never sped up) and the sleep timer. Where this chapter has a reading
//    that is not the one loaded, Listen takes Speed's place. A tap on the
//    cover or the title opens Now Playing, which holds everything else.
//  - C, while the reader reads on (lib/ui/scrollAway.ts) and in focus mode:
//    the card draws in to a small pill, the cover, Play or Pause, and the
//    time, and comes down to the foot with the tab bar. The chapter moves to
//    the top, between the round plates, which stay while it plays: a tap on
//    it opens the books sheet.
//
// The mini player steps aside for the reader on a phone and a tablet
// (lib/player/pagePlayer.ts, EVERYTHING), so one player shows for one
// voice. The card and its pill are one surface that draws in and comes
// back, as the mini player's do; the drawing is in app/globals.css ("The
// reader's dock"), keyed on the same attribute as the reader's other
// controls, so the two never disagree about whether the reader is away.

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { AmbienceButton } from "@/components/player/AmbienceButton";
import { CoverArt } from "@/components/player/CoverArt";
import { SleepTimerSheet } from "@/components/player/SleepTimerSheet";
import { clock } from "@/components/player/Transport";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Headphones } from "@/components/ui/icons/Headphones";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { Timer } from "@/components/ui/icons/Timer";
import { useAmbience } from "@/lib/ambience/player";
import { cn } from "@/lib/cn";
import { openNowPlaying } from "@/lib/player/sheet";
import { minutesLeft, useSleepTimer } from "@/lib/player/sleep";
import { nextSpeed, saveSpeed, speedText } from "@/lib/player/speed";
import { playingOf } from "@/lib/player/steps";
import { pause, play, setRate, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
import { readingOfSrc, useHasReadAloud } from "@/lib/readAloud/chapters";
import { startReading } from "@/lib/readAloud/play";
import { noteFootMoved } from "@/lib/ui/scrollAway";

type Target = { slug: string; chapter: number } | null;

/** The class on <html> while the dock stands at the reader's foot (app/globals.css). */
export const DOCK_CLASS = "has-reader-dock";
/** The card at rest, its two rows (globals.css, .reader-dock), and its chapter's row on one line. */
const CARD_PX = 112;
const CHAPTER_ROW_PX = 32;

export function ReaderDock({
  slug,
  chapter,
  bookName,
  prev,
  next,
  prevLabel,
  nextLabel,
  pickLabel,
  covered,
  onPick,
}: {
  slug: string;
  chapter: number;
  /** The book's name in the reader's language. */
  bookName: string;
  prev: Target;
  next: Target;
  prevLabel: string;
  nextLabel: string;
  /** "Pick a chapter, currently John 1". */
  pickLabel: string;
  /** Something stands over the reader (lib/ui/overlay.ts): the dock steps aside, as the pill does. */
  covered: boolean;
  /** Opens the books sheet. */
  onPick: () => void;
}) {
  const { t, locale } = useTranslate();
  const audio = usePersistentAudio();
  const ambience = useAmbience();
  const sleep = useSleepTimer();
  const reads = useHasReadAloud(slug, chapter);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const chapterRowRef = useRef<HTMLDivElement>(null);

  // The page makes room for the card at its foot, the way out of focus
  // stands over the pill, and the reader's plates stay while it plays
  // (app/globals.css, keyed on the class). Before the first paint, so no
  // frame shows the card over a page that has not made room; the scroll
  // watchers are told, so the page settling is not read as the reader.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add(DOCK_CLASS);
    noteFootMoved();
    return () => {
      root.classList.remove(DOCK_CLASS);
      noteFootMoved();
    };
  }, []);

  // The card's height: its two rows at rest (CARD_PX), and as much again as
  // the chapter's row grows past its one line (its own min-height, which is
  // in rem and follows the app's type size: 34px at 17) when a long name
  // sends its controls down a line. On the root, since the page keeps the
  // card's room at its foot (globals.css, --reader-dock-room).
  useLayoutEffect(() => {
    const row = chapterRowRef.current;
    if (!row) return;
    const root = document.documentElement;
    const measure = () => {
      const oneLine = parseFloat(getComputedStyle(row).minHeight) || CHAPTER_ROW_PX;
      root.style.setProperty("--reader-dock-card-h", `${Math.ceil(CARD_PX + Math.max(0, row.getBoundingClientRect().height - oneLine - 0.5))}px`);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return () => root.style.removeProperty("--reader-dock-card-h");
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--reader-dock-card-h");
    };
  }, []);

  // The pill's own width, which the surface draws in to. The time sets it.
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const face = pillRef.current;
    if (!surface || !face) return;
    const measure = () => surface.style.setProperty("--reader-dock-pill-w", `${Math.ceil(face.getBoundingClientRect().width)}px`);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(face);
    return () => observer.disconnect();
  }, []);

  const played = audio.duration > 0 ? Math.min(1, Math.max(0, audio.currentTime / audio.duration)) : 0;
  const name = audio.title ?? t("prayers.nowPlaying");
  const openLabel = `${t("prayers.nowPlaying")}: ${audio.title ?? ""}`;
  const toggle = () => (audio.playing ? pause() : play());
  const toggleLabel = audio.playing ? t("prayers.pause") : t("prayers.play");
  // This chapter's reading, where it has one that is not the one loaded. By
  // the chapter the loaded recording reads, not by its address: the address
  // changes when the chapter is saved to the phone while it plays (the
  // week's readings can save today's on opening, lib/readAloud/week.ts), and
  // the dock then offered Listen for the chapter already playing.
  const loaded = readingOfSrc(audio.src);
  const hereLoaded = loaded?.book === slug && loaded.chapter === chapter;
  const listenHere = reads && !hereLoaded;
  // Speed is a chapter read aloud's alone, as in Now Playing (lib/player/speed.ts).
  const speedShown = playingOf(audio.src)?.kind === "chapter";
  const speed = speedText(audio.rate, locale);
  const total = audio.duration > 0 ? `/ ${clock(audio.duration)}` : null;
  const timerMinutes = sleep.kind === "minutes" ? minutesLeft(sleep) : null;
  const timerLabel =
    sleep.kind === "minutes"
      ? `${t("player.sleep")}: ${t("player.sleepIn", { count: timerMinutes ?? 0 })}`
      : sleep.kind === "end"
        ? `${t("player.sleep")}: ${t("player.sleepEnd")}`
        : t("player.sleep");

  const listen = async () => {
    setBusy(true);
    await startReading(slug, chapter, `${bookName} ${chapter}`, t);
    setBusy(false);
  };

  return (
    <>
      <div
        data-reader-dock
        // What stands at the foot of the screen (lib/ui/readingPlace.ts): the
        // verse being read aloud stands clear of the card, or of its pill.
        data-screen-edge="bottom"
        role="group"
        aria-label={t("prayers.nowPlaying")}
        // Out of reach and out of hearing while something stands over it.
        aria-hidden={covered || undefined}
        className={cn(
          "md:hidden native-md-flex pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3.5 motion-safe:transition-opacity motion-safe:duration-200",
          covered && "opacity-0",
        )}
        // Over the tab bar and today's readings' bar, clear of the home
        // indicator, with the pill's 12px under it. The mini player is never
        // on this screen with it, so its room is not counted.
        // --pill-lift: the fade under the card reaches down from it to the
        // foot of the screen (globals.css, .pill-fade).
        style={{
          ["--pill-lift" as string]: "calc(var(--tab-bar-h) + var(--readings-flow-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)",
          bottom: "var(--pill-lift)",
        }}
      >
        {/* The fade the card floats on, as the pill's: the words go quiet
            under it. It goes while the reader reads on. */}
        <span aria-hidden className="reader-dock-fade pill-fade pointer-events-none absolute inset-x-0 -z-10" />
        <div className="flex w-full max-w-md justify-center">
          <div
            ref={surfaceRef}
            className={cn(
              "reader-dock relative bg-night-soft shadow-[0_14px_34px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-paper/[0.08]",
              covered ? "pointer-events-none" : "pointer-events-auto",
            )}
          >
            <div className="reader-dock-card absolute inset-0 flex flex-col overflow-hidden rounded-[inherit] px-3.5 pb-[5px] pt-3">
              {/* The player: the cover, the title over how far it has
                  played, the sound while one plays, and Play or Pause. */}
              <div className="flex h-[46px] shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => openNowPlaying()}
                  aria-label={openLabel}
                  className="tap-press flex h-full min-w-0 flex-1 items-center gap-3 text-start"
                >
                  <CoverArt src={audio.art} fallback={audio.artFallback} size={46} className="size-[46px] shrink-0 rounded-[11px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-[15px] font-semibold leading-tight text-paper">{name}</span>
                    <span aria-hidden className="mt-2 block h-[3px] overflow-hidden rounded-full bg-paper/15">
                      <span
                        className="block h-full origin-left rounded-full bg-paper rtl:origin-right"
                        style={{ transform: `scaleX(${played})` }}
                      />
                    </span>
                  </span>
                </button>
                {ambience.playing ? <AmbienceButton variant="bar" /> : null}
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={toggleLabel}
                  className="tap-press grid size-[44px] shrink-0 place-items-center rounded-full bg-paper text-night"
                >
                  {audio.playing ? <Pause size={18} /> : <Play size={18} centered />}
                </button>
              </div>
              <span aria-hidden className="-mx-3.5 mt-2.5 h-px shrink-0 bg-paper/[0.08]" />
              {/* The chapter: its arrows and its name, then Speed or Listen,
                  then the sleep timer. */}
              {/* A book's name is shown whole (the gate's confirm run,
                  2026-11-12: "1 Corinthians" and twelve more ended in an
                  ellipsis beside Listen). When it and the controls do not
                  fit on one line, the controls go down a line and the card
                  grows with it (--reader-dock-card-h, measured below). */}
              <div ref={chapterRowRef} className="mt-1.5 flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-x-2 font-sans text-[14px]">
                <span className="flex min-w-0 max-w-full items-center">
                  <DockArrow target={prev} label={prevLabel} back />
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={onPick}
                    aria-label={pickLabel}
                    className="tap-press hit-44 flex min-h-8 min-w-0 items-center px-1 text-start font-semibold leading-tight text-paper"
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">{bookName}</span>
                    <span className="ms-1 shrink-0 tabular-nums">{chapter}</span>
                  </button>
                  <DockArrow target={next} label={nextLabel} back={false} />
                </span>
                <span className="ms-auto flex shrink-0 items-center gap-2">
                {listenHere ? (
                  <button
                    type="button"
                    onClick={listen}
                    className="tap-press hit-44 flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-2 font-semibold text-paper"
                  >
                    <Headphones size={16} className={cn("shrink-0", busy && "motion-safe:animate-pulse")} />
                    {t("readAloud.listen")}
                  </button>
                ) : speedShown ? (
                  <button
                    type="button"
                    onClick={() => {
                      const step = nextSpeed(audio.rate);
                      saveSpeed(step);
                      setRate(step);
                    }}
                    aria-label={`${t("player.speed")}: ${speed}`}
                    className={cn(
                      "tap-press hit-44 h-8 shrink-0 rounded-pill px-2 tabular-nums",
                      audio.rate === 1 ? "text-paper/60" : "font-semibold text-paper",
                    )}
                  >
                    {speed}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSleepOpen(true)}
                  aria-haspopup="dialog"
                  aria-label={timerLabel}
                  className={cn(
                    "tap-press hit-44 flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-2",
                    sleep.kind === "off" ? "text-paper/60" : "text-paper",
                  )}
                >
                  <Timer size={16} className="shrink-0" />
                  {timerMinutes !== null ? (
                    <span aria-hidden className="tabular-nums">
                      {t("today.minRead", { count: timerMinutes })}
                    </span>
                  ) : null}
                </button>
                </span>
              </div>
            </div>

            {/* The pill: the cover, Play or Pause, and the time. */}
            <div
              ref={pillRef}
              className="reader-dock-pill absolute bottom-0 left-1/2 flex h-[52px] w-max -translate-x-1/2 items-center gap-2.5 pe-4 ps-1.5"
            >
              <button
                type="button"
                onClick={() => openNowPlaying()}
                aria-label={openLabel}
                className="tap-press hit-44 shrink-0 rounded-full"
              >
                <CoverArt src={audio.art} fallback={audio.artFallback} size={40} className="size-10 rounded-full" />
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={toggleLabel}
                className="tap-press hit-44 grid size-10 shrink-0 place-items-center rounded-full bg-paper text-night"
              >
                {audio.playing ? <Pause size={16} /> : <Play size={16} centered />}
              </button>
              <span aria-hidden className="flex items-baseline gap-1 font-sans text-detail tabular-nums text-paper">
                <span>{clock(audio.currentTime)}</span>
                {total ? <span className="text-paper/55">{total}</span> : null}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* The chapter at the top while the reader reads on, between the
          plates: a tap opens the books sheet. Reader chrome, so focus mode
          puts it away with the plates. */}
      <div
        data-reader-chrome
        data-dock-title
        className="md:hidden native-md-flex pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex h-[52px] min-w-0 max-w-[calc(100%-8rem)] items-center">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onPick}
            aria-label={pickLabel}
            className="reader-dock-title tap-press hit-44 pointer-events-auto flex min-h-10 min-w-0 items-center gap-1.5 rounded-pill px-3.5 py-1 text-center font-sans text-[15px] font-semibold leading-tight"
          >
            {/* Shown whole: a long name takes a second line (the gate's confirm run, 2026-11-12). */}
            <span className="min-w-0 [overflow-wrap:anywhere]">{bookName}</span>
            <span className="shrink-0 tabular-nums">{chapter}</span>
            <ChevronDown size={14} className="shrink-0 text-paper/60" />
          </button>
        </div>
      </div>

      <SleepTimerSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />
    </>
  );
}

/** A step back or forward through the canon, in the dock's second row. */
function DockArrow({ target, label, back }: { target: Target; label: string; back: boolean }) {
  const glyph = <ChevronLeft size={18} className={back ? "rtl:-scale-x-100" : "-scale-x-100 rtl:scale-x-100"} />;
  if (!target) {
    return (
      <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center text-paper/25">
        {glyph}
      </span>
    );
  }
  return (
    <Link
      href={`/bible/${target.slug}/${target.chapter}`}
      aria-label={label}
      className="hit-44 inline-flex size-8 shrink-0 items-center justify-center text-paper/85 hover:text-paper"
    >
      {glyph}
    </Link>
  );
}
