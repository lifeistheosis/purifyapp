"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Reference } from "@/components/bible/Reference";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { BarSwitch } from "@/components/ui/BarSwitch";
import { CrossPlate } from "@/components/ui/CrossPlate";
import { Book } from "@/components/ui/icons/Book";
import { More } from "@/components/ui/icons/More";
import { Timer } from "@/components/ui/icons/Timer";
import { useAmbienceLeaving, useAmbienceSheet } from "@/lib/ambience/sheet";
import { cn } from "@/lib/cn";
import { BACKDROP_FILTER, bakesBackdrop, paintBackdrop, readBackdrop, type Backdrop } from "@/lib/player/backdrop";
import { WORDS_BUILT_CLOSED, WORDS_SPANNED_NEAR, buildsLongWords, captionWordCount, verseOf } from "@/lib/player/captions";
import { takeCarry } from "@/lib/player/carry";
import { useSungLines } from "@/lib/player/clock";
import { closeNowPlaying, primeNowPlayingView, setPlayerView, useNowPlayingSheet, type PlayerView } from "@/lib/player/sheet";
import { useSleepTimer } from "@/lib/player/sleep";
import { nextSpeed, saveSpeed, speedText } from "@/lib/player/speed";
import { playingOf, readHref, shareHref } from "@/lib/player/steps";
import { seek, setLoopMode, setRate, usePersistentAudio, type LoopMode } from "@/lib/prayers/persistentAudioStore";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { AmbienceButton } from "./AmbienceButton";
import { CoverArt } from "./CoverArt";
import { LiveCaptions } from "./LiveCaptions";
import { PlayerMoreSheet } from "./PlayerMore";
import { PlayerTransport } from "./PlayerSteps";
import { SleepTimerSheet } from "./SleepTimerSheet";
import { SaveOffline, SaveOfflineNote } from "./SaveOffline";
import { OptionWord, PositionBar, optionClass } from "./Transport";

/**
 * Now Playing (1.7): the whole screen for what is playing, opened from the
 * mini player or from a chant. Drawn from the newest Apple Music and Spotify
 * screens the owner asked to take as the reference (2026-10-15,
 * Homebase/boards/purify-master/r17/ref/music/):
 *
 *   - the picture large and everything else black, no colour washed out of
 *     the icon into the page (our icons are gold, and gold is out);
 *   - back 15 and forward 15, a sleep timer, and the Anthem's own repeats;
 *   - one smooth slide up and down, and no blur moving with it (a blurred
 *     layer in motion costs an Android phone its frames).
 *
 * 1.8, the owner's pick of 2026-10-27 (round 8,
 * Homebase/boards/purify-master/variants/08-player): two views, switched,
 * never merged ("Keep the two separate, as in John 1 without the lyrics and
 * John 1 with the lyrics. Don't merge the two and add the photo"):
 *
 *   - Cover (round 8 A): the playing item's picture as the cover, its name and
 *     who it is under it, the download mark at the end of that line;
 *   - Words (round 8 B): the words alone, the verse or line being read lit and
 *     the rest dim, moving as it reads, the picture only small at their head
 *     beside the name and "Verse 4 of 51".
 *
 * The switch sits in the top bar, as the saint web's does, wherever the track
 * has words; the view chosen is kept on the device (lib/player/sheet.ts).
 * Everything under the middle is one block, the same in both views, so no
 * control the player has moves or goes missing when the view is switched:
 * where it is, back 15, Play, forward 15, and the choices under them (round
 * 8 A's "four choices"): Loop, Ambience and the sleep timer.
 *
 * What round 8 A drew and the first 1.8 build left out, for want of anything
 * behind it, went in with the owner's "add everything we left out" of
 * 2026-10-28, every control above where it was:
 *
 *   - previous and next at the ends of the controls (PlayerTransport): the
 *     chapter before and after where it has a recording, a chant's version
 *     before and after, today's reading before and after; none where there
 *     is nothing to go to (lib/player/steps.ts);
 *   - Speed among the choices, the Bible read aloud alone: 0.75 to 2, the
 *     reader's own, kept on the device; a chant is never sped up, so it has
 *     no Speed (lib/player/speed.ts);
 *   - Read, the last choice: the chapter at the verse being read, or the
 *     chant's page;
 *   - ••• at the right of the top bar, a sheet of Save for offline, the
 *     sleep timer, Ambience and Share (PlayerMoreSheet).
 *
 * On a computer it is a panel on the right, as Spotify's tablets have it. The
 * cover is an icon of the book's saint for a reading, kept on the website, so
 * with no signal it falls back to the bundled plate (CoverArt). The sleep
 * timer opens as a sheet over the player and is the one timer for everything
 * that plays (lib/player/sleep.ts).
 */
const LOOPS: LoopMode[] = ["off", "inf", 3, 7, 12];

/** The slide up and down, on the house curve (app/globals.css, --ease-house), which the carried picture shares. */
const SLIDE_MS = 380;
const HOUSE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Where the panel docks beside the page and slides from the side: nothing is carried there. */
const WIDE = "(min-width: 768px)";
const still = () => document.documentElement.dataset.motion === "reduce";

export function NowPlayingSheet() {
  const { t, locale } = useTranslate();
  const audio = usePersistentAudio();
  const { open, view } = useNowPlayingSheet();
  // Built while anything is loaded, not when it is opened (build 98 note 8,
  // his word of 2026-11-15: "make the music player opening more smooth"). The
  // tap used to mount the whole screen, the large cover and its decoding
  // included, and slide it two frames later, so the slide began while the
  // phone was still building it. Now it stands built and drawn closed, out of
  // sight, out of reach and out of hearing, and a tap only slides it. Ready
  // once it has been drawn closed: opened before that, it slides then.
  const hasSrc = Boolean(audio.src);
  const [ready, setReady] = useState(false);
  const up = open && ready;
  // Up and still: the slide has ended. The blurred picture behind it all is
  // drawn only then, and taken away as soon as it goes down, so no blur ever
  // moves (a blurred layer in motion costs an Android phone its frames).
  const [settled, setSettled] = useState(false);
  // That picture read small while the player stands closed, for the canvas it
  // is blurred into when shown (lib/player/backdrop.ts), so its first draw is
  // a small picture and no filter; kept with the art it was read from.
  const [bakes] = useState(bakesBackdrop);
  const [backdrop, setBackdrop] = useState<{ art: string; made: Backdrop } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const [sleepMenu, setSleepMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const sleep = useSleepTimer();
  const ambienceSheet = useAmbienceSheet();
  // A sheet stands over the player: Escape is that sheet's.
  const covered = sleepMenu || moreMenu || (ambienceSheet.open && ambienceSheet.overPlayer);
  // The ambience closed over the player is still on the screen while its close
  // runs: the words wait for it to go (build 97 note 10, Updates 67).
  const ambienceLeaving = useAmbienceLeaving() && ambienceSheet.overPlayer;
  const hasWords = Boolean(audio.captions && audio.captions.length > 0);
  const words = hasWords && view === "words";
  // A long text's words (a Father's work, a saint's life) are built once the
  // player is up, its slide has ended and the Words view is shown, and kept
  // for that text after; a chapter's and a chant's still stand built while
  // closed (note 8). Built closed, a work's were made and styled in its Listen
  // tap and in each turn of its parts: 28,657 elements, a 454ms task (Updates
  // 98m, build 98 note 2). Built on Cover, the view most open on, they cost
  // the first open a 258ms task for words not shown, and every open, close and
  // switch after it 120 to 230ms (CPU 1x, Updates 98n); now only the lines
  // near the one being read are drawn a word a span (WORDS_SPANNED_NEAR).
  const longWords = useMemo(() => captionWordCount(audio.captions) > WORDS_BUILT_CLOSED, [audio.captions]);
  const [wordsFor, setWordsFor] = useState<typeof audio.captions>(null);
  useEffect(() => {
    if (!longWords || !buildsLongWords({ up, settled, words }) || wordsFor === audio.captions) return;
    startTransition(() => setWordsFor(audio.captions));
  }, [longWords, up, settled, words, wordsFor, audio.captions]);
  const wordsBuilt = !longWords || wordsFor === audio.captions;
  // The one clock that lights the words and counts the verses
  // (lib/player/clock.ts), running while the player is open, and on while it
  // slides away (Updates 98o, build 98 note 8). Stopped at the close's tap, it
  // took every line to rest in the frame the slide began: the light went out,
  // a long text's words a span went to the top, and the words stood up to
  // 185px higher (the frame judge's "span 'that' jumped" on close, read before
  // as two words paired). Now the words leave as they stand, and go to rest
  // once the slide has ended and they are out of sight.
  const [clockOpen, setClockOpen] = useState(open);
  if (open && !clockOpen) setClockOpen(true);
  useEffect(() => {
    if (open || !clockOpen) return;
    const id = window.setTimeout(() => setClockOpen(false), still() ? 0 : SLIDE_MS + 60);
    return () => window.clearTimeout(id);
  }, [open, clockOpen]);
  const sung = useSungLines(audio.captions, audio.duration, clockOpen && hasWords);

  /* eslint-disable react-hooks/set-state-in-effect -- the sheet's own
     readiness and rest, driven by what is loaded and the store's open flag. */
  useEffect(() => {
    if (!hasSrc) {
      setReady(false);
      return;
    }
    // Built in the view it will open in, so opening changes nothing but its place.
    primeNowPlayingView();
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [hasSrc]);
  useEffect(() => {
    if (open) return;
    setSleepMenu(false);
    setMoreMenu(false);
  }, [open]);
  useEffect(() => {
    if (!up) {
      setSettled(false);
      return;
    }
    if (still()) {
      // No slide to wait for: the soft picture comes two frames after the
      // sheet, so drawing it is not in the tap's frame (Updates 98h: the two
      // in one frame made a 66.7ms one at a phone's speed).
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setSettled(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    // The panel's own transitionend settles it; this, if that never comes.
    const id = setTimeout(() => setSettled(true), SLIDE_MS + 240);
    return () => clearTimeout(id);
  }, [up]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // The soft picture behind it all, read small from the cover while the
  // player stands closed and the page is idle, and again whenever the cover's
  // picture arrives or changes (a later load, or the plate after an error).
  const art = audio.art;
  useEffect(() => {
    const holder = coverRef.current;
    const slab = panelRef.current;
    if (!ready || !art || !bakes || !holder || !slab) return;
    let gone = false;
    let wait = 0;
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 2000 }) : window.setTimeout(cb, 300);
    const read = () => {
      const img = holder.querySelector("img");
      if (!img || !img.complete || img.naturalWidth === 0) return;
      if (wait) (window.cancelIdleCallback ?? window.clearTimeout)(wait);
      wait = idle(() => {
        wait = 0;
        void readBackdrop(img, { width: slab.offsetWidth, height: slab.offsetHeight }).then((made) => {
          if (gone || !made) return made?.bitmap.close();
          setBackdrop((prev) => {
            prev?.made.bitmap.close();
            return { art, made };
          });
        });
      });
    };
    read();
    holder.addEventListener("load", read, true);
    return () => {
      gone = true;
      holder.removeEventListener("load", read, true);
      if (wait) (window.cancelIdleCallback ?? window.clearTimeout)(wait);
    };
  }, [ready, art, bakes]);
  const shownBackdrop = backdrop && backdrop.art === art ? backdrop.made : null;
  const paintRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas && shownBackdrop) paintBackdrop(canvas, shownBackdrop);
  }, [shownBackdrop]);

  // The mini player's picture carried up into the cover's place as the
  // screen rises (note 8): the house's way, a card carrying its picture into
  // what it opens. The panel clips what is inside it, so a copy flies on its
  // own, over the panel, from where the tapped picture stood (lib/player/
  // carry.ts) to where the cover will stand once the panel is up, on the
  // panel's curve and time, so the two land together; the cover is hidden
  // while it flies and shown in the frame it lands. It leaves the mini
  // player round and lands square: a round copy over a square one, the round
  // fading as they fly. Transform and opacity only, which the compositor
  // draws whatever the page is doing. On a phone alone (on a wider screen the
  // panel comes from the side), and never under reduced motion.
  useLayoutEffect(() => {
    if (!up) return;
    const from = takeCarry();
    const root = rootRef.current;
    const slab = panelRef.current;
    const flight = flightRef.current;
    const target = (words ? thumbRef : coverRef).current?.querySelector("img");
    if (!from || !root || !slab || !flight || !target || !target.complete || target.naturalWidth === 0) return;
    if (still() || window.matchMedia(WIDE).matches) return;
    const p = slab.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    // The panel's top is the screen's once it is up.
    const to = { left: t.left - p.left, top: t.top - p.top, width: t.width, height: t.height };
    if (to.width < 4 || to.height < 4) return;
    const look = getComputedStyle(target);
    const copy = (radius: string, shadow: string) => {
      const img = document.createElement("img");
      img.src = target.currentSrc || target.src;
      img.alt = "";
      img.decoding = "sync";
      img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${look.objectPosition};border-radius:${radius};box-shadow:${shadow}`;
      return img;
    };
    const square = copy(look.borderTopLeftRadius, look.boxShadow);
    const round = copy("50%", "none");
    flight.replaceChildren(square, round);
    Object.assign(flight.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, display: "block" });
    root.dataset.carrying = "";
    const timing: KeyframeAnimationOptions = { duration: SLIDE_MS, easing: HOUSE, fill: "both" };
    const moves = [
      flight.animate(
        [
          { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` },
          { transform: "none" },
        ],
        timing,
      ),
      round.animate([{ opacity: from.round ? 1 : 0 }, { opacity: 0 }], { duration: SLIDE_MS * 0.6, easing: "linear", fill: "both" }),
    ];
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      for (const m of moves) m.cancel();
      flight.style.display = "none";
      flight.replaceChildren();
      delete root.dataset.carrying;
    };
    moves[0].finished.then(land, land);
    return land;
  }, [up, words]);

  // Out of reach while it slides down (inert hit-tests as nothing, so a tap
  // goes to the page it uncovers), and once down out of sight, reach and
  // hearing by the closed class's own visibility (app/globals.css). Nothing
  // of that kind changes at the tap: inert or pointer-events set or taken
  // away on the root restyles every element in the sheet, where visibility
  // alone is the browser's quick kind (Updates 98h, a Chrome trace of the
  // tap: 16ms of its 31 at a phone's speed). Set on the element itself, so
  // the slide down costs no second render.
  const wasUp = useRef(false);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (up) {
      wasUp.current = true;
      return;
    }
    if (!wasUp.current) return;
    wasUp.current = false;
    if (still()) return;
    root.inert = true;
    const id = window.setTimeout(() => (root.inert = false), SLIDE_MS + 60);
    return () => {
      window.clearTimeout(id);
      root.inert = false;
    };
  }, [up]);

  // Esc closes, unless a sheet stands over the player, and the page under it
  // does not scroll while it is open. The lock is the counted one every sheet
  // takes (lib/ui/overlay.ts), so a sheet over the player closing after it,
  // or before it, leaves the page as it found it.
  useEffect(() => {
    if (!open || covered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNowPlaying();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, covered]);
  // The phone's back closes the player first, as it closes every sheet: the
  // player is no route of its own, so with nothing listening the back went to
  // the page under it, which changed while the player stayed (the owner,
  // 2026-10-19). A sheet over the player takes the back for itself.
  useAndroidBack(open && !covered, closeNowPlaying);
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  // Nothing loaded any more: nothing to show.
  useEffect(() => {
    if (open && !audio.src) closeNowPlaying();
  }, [open, audio.src]);

  if (!audio.src) return null;

  const loopIndex = LOOPS.indexOf(audio.loopMode);
  const loopLabel =
    audio.loopMode === "off" ? t("common.off") : audio.loopMode === "inf" ? t("prayers.audio.loop") : `${audio.loopMode}×`;
  const sleeping = sleep.kind !== "off";
  // "Verse 4 of 51" over a reading's words; who sings it over a chant's.
  const verse = words ? verseOf(sung.lines, sung.current) : null;
  // What is playing, for Speed, Read and Share (lib/player/steps.ts). Read
  // opens a chapter at the verse being read, in either view.
  const playing = playingOf(audio.src);
  const reading = verseOf(sung.lines, sung.current);
  const readTo = readHref(playing, reading?.verse);
  const speed = speedText(audio.rate, locale);
  const views: { id: PlayerView; label: string; icon: React.ReactNode }[] = [
    { id: "cover", label: t("player.viewCover"), icon: <CoverGlyph /> },
    { id: "words", label: t("player.viewWords"), icon: <WordsGlyph /> },
  ];
  // The two views cross-fade where they stand, and nothing else: the cover
  // stays exactly where it is both ways (the owner's note 3 of build 80, "the
  // cover jumps"). Each view used to carry a rise of 0.75rem (about 13px), a
  // translate under a transition that named only opacity and transform, and
  // Tailwind 4 draws a translate with the `translate` property, which that
  // list leaves out: the rise never moved, it jumped. The cover leapt up as
  // the words came, and came back lower than it was last seen.
  const panel = "absolute inset-0 flex flex-col transition-opacity duration-[380ms] ease-[var(--ease-house)] motion-reduce:transition-none";

  return (
    // Closed, it stands built but unseen (app/globals.css, .now-playing-closed):
    // out of reach and out of hearing, and no dialog, so nothing reads it as up.
    <div
      ref={rootRef}
      data-now-playing=""
      className={cn("fixed inset-0 z-[70]", !up && "now-playing-closed")}
      role={up ? "dialog" : undefined}
      aria-modal={up ? true : undefined}
      aria-label={up ? t("prayers.nowPlaying") : undefined}
      aria-hidden={up ? undefined : true}
    >
      {/* On a computer the page stays in view, dimmed, beside the panel: the
          house's own dim, every sheet's (components/ui/Sheet.tsx), drawn from
          the palette's night, so Light and every look dim in their own colour. */}
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={closeNowPlaying}
        className={cn(
          "absolute inset-0 hidden bg-night/60 transition-opacity duration-300 md:block",
          up ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && up) setSettled(true);
        }}
        data-mock-allow="stripe" data-mock-why="the player's edge, docked beside the page on a wide screen"
        className={cn(
          // Dark on every palette, as a player is (dark-island puts the
          // dark palette's tokens back inside it on Light). On a wide screen
          // it docks at the end of the line and leaves that way: the right in
          // English, the left in Arabic, its edge on the side the page is.
          "dark-island absolute inset-0 flex flex-col overflow-hidden bg-night md:start-auto md:w-[440px] md:border-s md:border-paper/10",
          // The house curve, which the carried picture shares, so they land together.
          "transition-transform duration-[380ms] ease-[var(--ease-house)] [:where([data-motion=reduce])_&]:transition-none",
          up ? "translate-y-0" : "translate-y-full md:translate-y-0 md:translate-x-full md:rtl:-translate-x-full",
        )}
      >
        {/* The picture again, grey and soft, behind it all: drawn once the
            slide has ended and faded in where it stands, taken away as the
            slide down starts, so the blur never moves (build 98 note 8). Read
            small before the tap and blurred into a small canvas, so drawing it
            is no long frame (Updates 98h, lib/player/backdrop.ts); where a
            canvas takes no filter, the cover under the filter, as before. */}
        {audio.art && up && settled ? (
          bakes ? (
            shownBackdrop ? (
              <canvas
                ref={paintRef}
                aria-hidden
                className="now-playing-backdrop pointer-events-none absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)] max-w-none"
              />
            ) : null
          ) : (
            <CoverArt
              src={audio.art}
              fallback={audio.artFallback}
              size={440}
              className="now-playing-backdrop pointer-events-none absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)] max-w-none"
              style={{ filter: BACKDROP_FILTER }}
            />
          )
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 520px at 20% -8%, rgba(255,255,255,0.06), transparent 68%), linear-gradient(180deg, rgba(11,11,14,0) 0%, rgba(11,11,14,0.55) 45%, var(--color-night, #0b0b0e) 82%)",
          }}
        />

        <div className="relative flex min-h-0 flex-1 flex-col px-7 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
          {/* Top: put it away, and the switch between the two views (the
              saint web's switch, round 1), or what this is when the track
              has no words to show. */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={closeNowPlaying}
              aria-label={t("common.close")}
              className="tap-press -ms-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper hover:bg-paper/[0.06]"
            >
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {hasWords ? (
              <BarSwitch
                label={t("prayers.nowPlaying")}
                idBase="player-view"
                items={views}
                selected={words ? "words" : "cover"}
                onSelect={setPlayerView}
                className="min-w-0"
              />
            ) : (
              <p className="font-sans text-detail font-semibold text-paper/60">{t("prayers.nowPlaying")}</p>
            )}
            {/* ••• (round 8 A): what the player does, in words, and Share. */}
            <button
              type="button"
              onClick={() => setMoreMenu(true)}
              aria-label={t("bible.moreActions")}
              aria-haspopup="dialog"
              className="tap-press -me-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper hover:bg-paper/[0.06]"
            >
              <More size={20} />
            </button>
          </div>

          {/* The middle: the cover, or the words. Both are drawn and the one
              not chosen fades away, so the switch is one smooth move; the
              one faded away cannot be reached, by a finger or a key. */}
          <div className="relative mt-4 min-h-0 flex-1">
            <div
              id="player-view-panel-cover"
              role={hasWords ? "tabpanel" : undefined}
              aria-labelledby={hasWords ? "player-view-tab-cover" : undefined}
              aria-hidden={words}
              inert={words}
              className={cn(panel, words ? "pointer-events-none opacity-0" : "opacity-100")}
            >
              {/* As large as the screen leaves it, to 340px, and square. */}
              <div ref={coverRef} data-carry-to="" className="relative flex min-h-0 flex-1 items-center justify-center [container-type:size]">
                {audio.art ? (
                  <CoverArt
                    src={audio.art}
                    fallback={audio.artFallback}
                    size={340}
                    className="aspect-square h-auto max-h-full w-[min(100cqw,100cqh,340px)] max-w-full rounded-[18px] object-[50%_18%] shadow-[0_24px_50px_rgba(0,0,0,0.55)]"
                  />
                ) : (
                  // No picture (a chant with no cover): the plate, never an empty space (1.8).
                  <CrossPlate
                    size="hero"
                    className="aspect-square w-[min(100cqw,100cqh,340px)] max-w-full rounded-[18px] shadow-[0_24px_50px_rgba(0,0,0,0.55)]"
                  />
                )}
              </div>
              <div className="mx-auto mt-6 flex w-full max-w-[340px] items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-[26px] font-bold leading-tight text-paper">{audio.title ? <Reference>{audio.title}</Reference> : null}</h2>
                  {audio.artist ? <p className="mt-1 truncate font-sans text-ui text-paper/55">{audio.artist}</p> : null}
                </div>
                <SaveOffline src={audio.src} className="-me-2.5" />
              </div>
            </div>

            {hasWords ? (
              <div
                id="player-view-panel-words"
                role="tabpanel"
                aria-labelledby="player-view-tab-words"
                aria-hidden={!words}
                inert={!words}
                className={cn(panel, words ? "opacity-100" : "pointer-events-none opacity-0")}
              >
                <div className="flex items-center gap-3">
                  {audio.art ? (
                    <span ref={thumbRef} data-carry-to="" className="contents">
                      <CoverArt
                        src={audio.art}
                        fallback={audio.artFallback}
                        size={48}
                        className="h-12 w-12 shrink-0 rounded-[10px] object-[50%_18%]"
                      />
                    </span>
                  ) : (
                    <CrossPlate size="thumb" className="h-12 w-12 shrink-0 rounded-[10px]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[15.5px] font-semibold leading-tight text-paper">{audio.title}</p>
                    {verse ? (
                      <p className="mt-0.5 truncate font-sans text-detail text-paper/55">
                        {t("player.verseOf", { verse: verse.verse, total: verse.total })}
                      </p>
                    ) : audio.artist ? (
                      <p className="mt-0.5 truncate font-sans text-detail text-paper/55">{audio.artist}</p>
                    ) : null}
                  </div>
                  <SaveOffline src={audio.src} className="-me-2.5" />
                </div>
                {wordsBuilt ? (
                  <LiveCaptions
                    source={audio.captions!}
                    lines={sung.lines}
                    timed={sung.timed}
                    current={sung.current}
                    live
                    // Under a sheet over the player (the ambience, its ••• sheet) the
                    // lit words rest: each frame's glow restyled the line behind the
                    // sheet and held its rise to 36 frames in 1.5s on a phone's CPU
                    // (build 97 note 10, scripts/ambience-open-walk.mjs). Uncovered,
                    // they ease to the line being read, as on coming back from Cover;
                    // the ambience uncovers them once its close has run, not as it
                    // starts, or the glow held its fall to 26 frames (Updates 67).
                    active={up && words && !covered && !ambienceLeaving}
                    look="player"
                    rtl={audio.rtl}
                    spanNear={longWords ? WORDS_SPANNED_NEAR : undefined}
                    onSeek={seek}
                    className="-mx-1 mt-2 min-h-0 flex-1 px-1"
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          {/* One block for both views: nothing here moves when they switch. The
              saved line sets its own visibility when it speaks, so while the
              player stands closed its holder keeps it out of reach. */}
          <div inert={!up} className="contents">
            <SaveOfflineNote src={audio.src} className="mt-2" />
          </div>
          <PositionBar current={audio.currentTime} duration={audio.duration} onSeek={(at) => seek(at)} className="mt-2" />
          <PlayerTransport audio={audio} className="mt-3" />

          {/* The choices under the controls (round 8 A), each its mark over a
              word, lit white while it is on, each an even share of the row:
              Loop, Speed (the Bible read aloud alone), Ambience, the sleep
              timer and Read. */}
          <div className="mt-5 grid grid-flow-col auto-cols-[minmax(0,1fr)] items-start gap-0.5">
            <button
              type="button"
              onClick={() => setLoopMode(LOOPS[(loopIndex + 1) % LOOPS.length])}
              aria-label={`${t("prayers.audio.loop")}: ${loopLabel}`}
              className={optionClass(audio.loopMode !== "off")}
            >
              {typeof audio.loopMode === "number" ? (
                <span aria-hidden className="grid place-items-center text-[15px] font-bold leading-none" style={{ height: 21 }}>
                  {audio.loopMode}×
                </span>
              ) : (
                <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M17 2l3 3-3 3" />
                  <path d="M4 11V9a4 4 0 0 1 4-4h12" />
                  <path d="M7 22l-3-3 3-3" />
                  <path d="M20 13v2a4 4 0 0 1-4 4H4" />
                </svg>
              )}
              <OptionWord>{t("player.option.loop")}</OptionWord>
            </button>
            {/* Speed: the Bible read aloud alone. A sung chant is never sped
                up, so a chant has none (lib/player/speed.ts). */}
            {playing?.kind === "chapter" ? (
              <button
                type="button"
                onClick={() => {
                  const next = nextSpeed(audio.rate);
                  saveSpeed(next);
                  setRate(next);
                }}
                aria-label={`${t("player.speed")}: ${speed}`}
                className={optionClass(audio.rate !== 1)}
              >
                <span aria-hidden className="grid place-items-center text-[15px] font-bold leading-none text-paper" style={{ height: 21 }}>
                  {speed}
                </span>
                <OptionWord>{t("player.option.speed")}</OptionWord>
              </button>
            ) : null}
            <AmbienceButton variant="option" />
            <button
              type="button"
              onClick={() => setSleepMenu(true)}
              aria-label={t("player.sleep")}
              aria-haspopup="dialog"
              className={optionClass(sleeping)}
            >
              <Timer size={21} />
              <OptionWord>{t("player.option.sleep")}</OptionWord>
            </button>
            {/* Read: the text being played, where it has got to. */}
            {readTo ? (
              <Link
                href={readTo}
                onClick={() => closeNowPlaying()}
                aria-label={audio.title ? `${t("player.read")}: ${audio.title}` : t("player.read")}
                className={optionClass(false)}
              >
                <Book size={21} />
                <OptionWord>{t("player.option.read")}</OptionWord>
              </Link>
            ) : null}
          </div>

          {/* •••: Save for offline, the sleep timer, Ambience and Share, as a
              sheet over the player. */}
          <PlayerMoreSheet
            open={moreMenu}
            onClose={() => setMoreMenu(false)}
            title={audio.title ?? t("prayers.nowPlaying")}
            src={audio.src}
            share={shareHref(playing)}
            onSleep={() => setSleepMenu(true)}
          />

          {/* The sleep timer, as a sheet over the player: the one timer for
              the voice, a chant and the ambience (lib/player/sleep.ts). The
              reader's dock opens the same sheet (components/player/SleepTimerSheet.tsx). */}
          <SleepTimerSheet open={sleepMenu} onClose={() => setSleepMenu(false)} layer="over-player" />
        </div>
      </div>
      {/* The carried picture, over the panel while it flies (above). */}
      <div ref={flightRef} aria-hidden className="pointer-events-none fixed origin-top-left" style={{ display: "none" }} />
    </div>
  );
}

/** The cover view's mark: a picture in its frame. */
function CoverGlyph() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M3.5 16.5l5-5 4 4 3-3 5 5" />
    </svg>
  );
}

/** The words view's mark: lines of words, the first the longest. */
function WordsGlyph() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" aria-hidden>
      <path d="M4 6.5h16M4 12h12M4 17.5h9" />
    </svg>
  );
}
