"use client";

// A text's own foot pill (1.9, build 98 note 2, the owner's "make the listen
// system the same as the Bible listening system (UI/ux) one so there isn't a
// floating button"): a saint's life, a study's part and an event's account
// listen as a chapter of the Bible does. The Bible's pill
// (components/bible/MobileChapterPill.tsx) as drawn: the text's arrows where
// it has parts to turn (a study's), its name in the chapter's place, a
// hairline, the sound, then Listen; while anything is loaded, the reader's
// dock (components/bible/ReaderDock.tsx), one card for the player and the
// text's own row, which draws in to the small pill as the reader reads on,
// and the mini player steps aside (lib/player/pagePlayer.ts). No Listen
// button stands in the page on a phone or a tablet (ListenHere, computer only).
//
// Where the page has nothing Listen could read and nothing is loaded, there
// is no pill: no floating button that does nothing.

import { useLayoutEffect } from "react";

import { HOSTS_EVERYTHING, NOTHING, useDockShows } from "@/components/bible/MobileChapterPill";
import { ReaderDock } from "@/components/bible/ReaderDock";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { AmbienceButton } from "@/components/player/AmbienceButton";
import { ListenPillButton, useListenText } from "@/components/reading/ListenHere";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { cn } from "@/lib/cn";
import { textDir } from "@/lib/i18n/textDir";
import { listenFor, useListenOnPage } from "@/lib/listen/onPage";
import { useOwnPlayer } from "@/lib/player/pagePlayer";
import { usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
import { useOverlayOpen } from "@/lib/ui/overlay";
import { noteFootMoved, useScrollAway } from "@/lib/ui/scrollAway";

/** The class on <html> while a text's pill stands at the foot: the page keeps its room (globals.css, "A text's own pill"). */
export const TEXT_PILL_CLASS = "has-text-pill";

/** A turn of the text's parts, from the pill and the dock. */
export type TextStep = { onGo: () => void; name: string } | null;

export function TextPill({
  name: given,
  nameKey,
  nameLang,
  part,
  prev = null,
  next = null,
  screen = false,
}: {
  /** The text's name, or the part shown's. */
  name?: string;
  /** Or the key of its name in the reader's words ("Life", "What happened"). */
  nameKey?: string;
  nameLang?: string;
  /** The part shown, where the page holds several (a study's): Listen reads that one. */
  part?: number;
  prev?: TextStep;
  next?: TextStep;
  /**
   * The page's controls step away as the reader reads on (lib/ui/scrollAway.ts),
   * so the dock draws in: for a page that is not already a reader's screen
   * (a life, an event; a study's reader is one).
   */
  screen?: boolean;
}) {
  const { t } = useTranslate();
  const name = given ?? (nameKey ? t(nameKey) : "");
  const covered = useOverlayOpen();
  const text = listenFor(useListenOnPage(), part);
  const listen = useListenText(text);
  const dockShows = useDockShows();
  const { src } = usePersistentAudio();
  const docked = dockShows && Boolean(src);
  const shows = dockShows && (docked || listen.available);
  useOwnPlayer(shows ? HOSTS_EVERYTHING : NOTHING);

  // The page keeps the pill's room at its foot, and the dock's while it plays
  // (globals.css), before the first paint; the scroll watchers are told.
  useLayoutEffect(() => {
    if (!shows) return;
    const root = document.documentElement;
    root.classList.add(TEXT_PILL_CLASS);
    noteFootMoved();
    return () => {
      root.classList.remove(TEXT_PILL_CLASS);
      noteFootMoved();
    };
  }, [shows]);

  if (!shows) return null;

  const turns = Boolean(prev || next);
  const prevLabel = prev ? t("bible.previousTargetAria", { book: prev.name, chapter: "" }).trim() : t("bible.noPreviousChapter");
  const nextLabel = next ? t("bible.nextTargetAria", { book: next.name, chapter: "" }).trim() : t("bible.noNextChapter");

  return (
    <>
      {screen ? <ReaderScreen /> : null}
      {docked ? (
        <ReaderDock
          name={name}
          nameLang={nameLang}
          prev={prev ? { onGo: prev.onGo } : null}
          next={next ? { onGo: next.onGo } : null}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
          covered={covered}
          listenHere={listen.available && !listen.loaded}
          onListen={listen.tap}
        />
      ) : (
        <div
          aria-label={name}
          role="group"
          data-reader-chrome
          data-reader-pill
          data-text-pill=""
          // What stands at the foot of the screen (lib/ui/readingPlace.ts): the
          // paragraph being read aloud stands clear of it.
          data-screen-edge="bottom"
          // Out of reach and out of hearing while something stands over it.
          aria-hidden={covered || undefined}
          className={cn(
            "md:hidden native-md-flex fixed inset-x-0 z-40 flex flex-col items-center gap-1.5 px-4 pointer-events-none motion-safe:transition-opacity motion-safe:duration-200",
            covered && "opacity-0",
          )}
          // As the Bible's pill: clear of the tab bar, the now-playing bar when
          // one is up, today's readings' bar and the home indicator, 12px over them.
          style={{
            ["--pill-lift" as string]: "calc(var(--tab-bar-h) + var(--now-playing-h) + var(--readings-flow-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)",
            bottom: "var(--pill-lift)",
          }}
        >
          {/* The fade the pill floats on, down to the foot of the screen, behind it and the tab bar. */}
          <span aria-hidden className="pill-fade pointer-events-none absolute inset-x-0 -z-10" />
          <div
            className={cn(
              "reader-pill-in flex h-14 min-w-0 max-w-full items-center gap-0.5 rounded-pill border border-paper/10 bg-night-soft px-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.55)]",
              covered ? "pointer-events-none" : "pointer-events-auto",
            )}
          >
            {turns ? <PillArrow step={prev} label={prevLabel} back /> : null}
            {/* The name in the chapter's place, on up to two lines, as the Bible pill's may take. */}
            <span
              lang={nameLang}
              dir={textDir(nameLang)}
              className={cn(
                "flex h-11 min-w-0 items-center font-sans text-[15px] font-semibold leading-tight text-paper",
                turns ? "px-2" : "ps-3 pe-1",
              )}
            >
              <span className="min-w-0 line-clamp-2">{name}</span>
            </span>
            {turns ? <PillArrow step={next} label={nextLabel} back={false} /> : null}
            <span aria-hidden className="mx-1.5 h-6 w-px shrink-0 bg-paper/15" />
            <span className="flex shrink-0 items-center gap-0.5">
              <AmbienceButton variant="pill" />
              <ListenPillButton text={text} />
            </span>
          </div>
        </div>
      )}
    </>
  );
}

/** The page's controls step away as the reader reads on, while the pill stands. */
function ReaderScreen() {
  useScrollAway();
  return null;
}

/** A turn of the text's parts, as the Bible pill's arrows: 40px drawn, 44 to the touch. */
function PillArrow({ step, label, back }: { step: TextStep; label: string; back: boolean }) {
  return (
    <button
      type="button"
      disabled={!step}
      onClick={step?.onGo}
      aria-label={label}
      className={cn(
        "hit-44 inline-flex h-10 w-10 shrink-0 items-center justify-center",
        step ? "text-paper/85 hover:text-paper" : "text-paper/25",
      )}
    >
      <ChevronLeft size={20} className={back ? "rtl:-scale-x-100" : "-scale-x-100 rtl:scale-x-100"} />
    </button>
  );
}
