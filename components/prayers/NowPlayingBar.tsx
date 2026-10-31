"use client";

// The mini player (1.7): what is playing, in a slim solid bar just above the
// tab bar, from anywhere in the app. A tap opens Now Playing
// (components/player/NowPlayingSheet.tsx); the play button and the cross work
// in place.
//
// It steps aside (1.8, the owner's pick B of r3-05, "the small pill":
// Homebase/boards/purify-master/variants/r3-05-mini-player). His note on
// build 80: "make it so that when you scroll or you start doing other stuff,
// it kind of minimizes, but it's still there". On a scroll down the card
// draws in to a pill over the tabs, the disc, the name and Play, and it comes
// back the way the Bible's own pill does, on a scroll up and at the top of
// every page (lib/ui/scrollAway.ts). Play and Pause work on the pill without
// opening anything; a tap on its name opens Now Playing, as a tap on the card
// does. It draws in whether it plays or waits, and on a scroll only, never on
// a tap on the page. On the Bible's page, whose tab bar steps away as the
// reader reads on, it draws in with the page's own pill and comes down to the
// foot with the tab bar (app/globals.css, .now-playing-lift), and comes back
// with them. The room each page keeps at its foot follows it, the card's
// 56px or the pill's 40px (app/globals.css, --now-playing-h), so no page
// leaves anything under it in either state.
//
// The cover is a disc in a ring, and the ring is how far it has played: lit
// white while it plays, grey while it waits. It took the place of 1.7's thin
// line along the card's foot.
//
// lib/prayers/persistentAudioStore.ts keeps one HTMLAudioElement at module
// scope, outside the React tree, so playback survives navigation, and this
// bar subscribes to the same snapshot.
//
// Drawn from the newest Apple Music and Spotify screens the owner asked to
// take as the reference (2026-10-15): the picture, the name, the button.
// Solid, with no blur: the Android web view drops frames under a blurred
// layer in the scroll path, which is why the bar it replaces lost its
// backdrop blur here.
//
// MOUNTED IN THE ROOT FRAME, not in (app)/layout.tsx. Today lives at
// app/page.tsx, OUTSIDE the (app) route group, so the app layout unmounts on
// every Today tap and a bar mounted there would blink out of existence
// exactly when a reader taps home. The root frame wraps both trees.
//
// Renders nothing at all when nothing is loaded, so it costs an empty
// component on every other surface.
//
// AMBIENCE (1.7, the owner's note 25 of 2026-10-16). The ambience plays on
// every screen until it is stopped, and until 1.7 nothing outside the
// reader's settings showed it or could stop it. So the bar shows it too:
// while a track and a sound play together, the sound button stands lit
// between the title and Play; while only a sound plays, the bar is the
// sound's own, its name and a Stop, and a tap opens the ambience sheet. That
// bar draws in the same way: the sound's mark in the disc's place, its name,
// and Stop.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { AmbienceButton, AmbienceIcon } from "@/components/player/AmbienceButton";
import { RingCover } from "@/components/player/RingCover";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { Stop } from "@/components/ui/icons/Stop";
import { getAmbienceTrack } from "@/lib/ambience/ambience";
import { stopAmbience, useAmbience } from "@/lib/ambience/player";
import { openAmbience } from "@/lib/ambience/sheet";
import { connectLockScreen } from "@/lib/player/lockScreen";
import { openNowPlaying, useNowPlayingSheet } from "@/lib/player/sheet";
import { pause, play, unload, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
import { noteFootMoved, watchScrollAway } from "@/lib/ui/scrollAway";

export function NowPlayingBar() {
  const { t } = useTranslate();
  const { src, title, artist, art, artFallback, playing, currentTime, duration } = usePersistentAudio();
  const { open } = useNowPlayingSheet();
  const ambience = useAmbience();
  const sound = getAmbienceTrack(ambience.playing ?? ambience.loading);

  // Whether the bar paints: a track loaded and Now Playing not covering it,
  // or a sound playing on its own.
  const soundOnly = !src && Boolean(sound);
  const visible = (Boolean(src) && !open) || soundOnly;

  // The lock screen and the notification's controls (1.8), in the apps only.
  // Here because this bar is mounted once for the whole app (RootFrame).
  useEffect(() => connectLockScreen(), []);

  if (!visible) return null;

  if (soundOnly && sound) {
    const name = t(sound.labelKey);
    const label = t("ambience.playingAria", { sound: name });
    return (
      <MiniPlayer
        card={
          <>
            <button
              type="button"
              onClick={() => openAmbience()}
              aria-haspopup="dialog"
              aria-label={label}
              className="tap-press flex min-w-0 flex-1 items-center gap-3 text-start"
            >
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-paper/10 text-paper">
                <AmbienceIcon icon={sound.icon} size={22} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-sans text-detail font-semibold text-paper">{name}</span>
                <span className="block truncate font-sans text-caption text-paper/55">{t("ambience.title")}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => stopAmbience()}
              aria-label={t("ambience.stop")}
              className="tap-press hit-44 grid h-10 w-10 shrink-0 place-items-center rounded-full text-paper hover:bg-paper/10"
            >
              <Stop size={15} />
            </button>
          </>
        }
        pill={
          <>
            <button
              type="button"
              onClick={() => openAmbience()}
              aria-haspopup="dialog"
              aria-label={label}
              className="tap-press hit-44 flex h-full min-w-0 items-center gap-2.5 text-start"
            >
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-paper/10 text-paper">
                <AmbienceIcon icon={sound.icon} size={16} />
              </span>
              <PillName>{name}</PillName>
            </button>
            <PillButton onClick={() => stopAmbience()} label={t("ambience.stop")}>
              <Stop size={12} />
            </PillButton>
          </>
        }
      />
    );
  }

  const played = duration > 0 ? currentTime / duration : 0;
  const name = title ?? t("prayers.nowPlaying");
  const openLabel = `${t("prayers.nowPlaying")}: ${title ?? ""}`;
  const toggle = () => (playing ? pause() : play());
  const toggleLabel = playing ? t("prayers.pause") : t("prayers.play");

  return (
    <MiniPlayer
      card={
        <>
          <button
            type="button"
            onClick={() => openNowPlaying()}
            aria-label={openLabel}
            className="tap-press flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <RingCover art={art} fallback={artFallback} played={played} lit={playing} size="card" />
            <span className="min-w-0">
              <span className="block truncate font-sans text-detail font-semibold text-paper">{name}</span>
              {artist ? <span className="block truncate font-sans text-caption text-paper/55">{artist}</span> : null}
            </span>
          </button>

          {/* A sound under the track: lit, and a tap opens its sheet. */}
          {ambience.playing ? <AmbienceButton variant="bar" /> : null}

          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            className="tap-press grid h-10 w-10 shrink-0 place-items-center rounded-full text-paper hover:bg-paper/10"
          >
            {playing ? <Pause size={22} /> : <Play size={22} className="translate-x-[1px]" />}
          </button>

          <button
            type="button"
            onClick={() => unload()}
            aria-label={t("prayers.dismissPlayer")}
            className="tap-press grid h-8 w-8 shrink-0 place-items-center rounded-full text-paper/55 hover:bg-paper/10 hover:text-paper"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </>
      }
      pill={
        <>
          <button
            type="button"
            onClick={() => openNowPlaying()}
            aria-label={openLabel}
            className="tap-press hit-44 flex h-full min-w-0 items-center gap-2.5 text-start"
          >
            <RingCover art={art} fallback={artFallback} played={played} lit={playing} size="pill" />
            <PillName>{name}</PillName>
          </button>
          <PillButton onClick={toggle} label={toggleLabel}>
            {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-[1px]" />}
          </PillButton>
        </>
      }
    />
  );
}

/**
 * The room the page gives back when the card draws in: the card is 3.5rem
 * tall and the pill 2.5rem (app/globals.css, .mini-player), so 16px on the
 * web and in the apps alike.
 */
const ROOM_GIVEN_BACK = 16;

/**
 * The card and its pill, as one surface that draws in and comes back
 * (app/globals.css, "The mini player draws in"). Mounted while something
 * shows in it, so it opens as the card each time it appears.
 */
function MiniPlayer({ card, pill }: { card: ReactNode; pill: ReactNode }) {
  const [drawn, setDrawn] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  // The floating reader elements (MobileChapterPill, MobileVerseToolbar,
  // MobileWorkPill) sit a fixed distance above the tab bar, which is 0 on the
  // web, so a track playing would bury the pill under this player. Flag the
  // player on <html> while it paints and globals.css lifts them clear via
  // --now-playing-h, and every page's foot makes room for it. Same shape as
  // CartFab's .has-cart-fab. Before the first paint, so no frame shows the
  // card over a page that has not made room.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-now-playing");
    noteFootMoved();
    return () => {
      root.classList.remove("has-now-playing");
      noteFootMoved();
    };
  }, []);

  // And the pill's room once it has drawn in. The page's foot moves with it,
  // which the scroll watchers are told, so the page settling to its new end
  // is not read as the reader scrolling back up. Except at the very end of a
  // page, where giving the room back would move the page under the reader's
  // eyes by what it gave: there the pill keeps the card's room (more than it
  // needs, never less) until it is a card again.
  useLayoutEffect(() => {
    if (!drawn) return;
    const root = document.documentElement;
    const left = root.scrollHeight - (window.scrollY + window.innerHeight);
    if (left < ROOM_GIVEN_BACK) return;
    root.classList.add("now-playing-drawn");
    noteFootMoved();
    return () => {
      root.classList.remove("now-playing-drawn");
      noteFootMoved();
    };
  }, [drawn]);

  // Draws in on a scroll down, back on a scroll up and at a page's top. Not
  // while the keyboard is on one of its controls: the one in hand would go.
  useEffect(
    () =>
      watchScrollAway((away) => {
        if (!keyboardOn(shellRef.current)) setDrawn(away);
      }),
    [],
  );

  // The pill's own width, which the surface draws in to. The name sets it,
  // so a new title, a language or a font arriving can change it.
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const face = pillRef.current;
    if (!surface || !face) return;
    const measure = () => surface.style.setProperty("--mini-player-pill-w", `${Math.ceil(face.getBoundingClientRect().width)}px`);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(face);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={shellRef}
      // z-55 keeps it above the tab bar (z-50) so it is never covered, and
      // `now-playing-lift` moves it ABOVE the bar inside the native shell
      // (globals.css): both pinned to bottom-0 once hid the whole tab bar for
      // as long as the anthem played. On the web there is no tab bar and it
      // stays at the bottom with its own safe-area padding.
      className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] md:pb-2"
      // What stands at the foot of the screen, which a page going to a place
      // keeps clear of (lib/ui/readingPlace.ts): the card, or the pill.
      data-screen-edge="bottom"
      data-mini-player=""
      data-drawn={drawn ? "" : undefined}
    >
      <div className="mx-auto max-w-md">
        <div
          ref={surfaceRef}
          className="mini-player pointer-events-auto relative mx-auto bg-night-soft shadow-[0_10px_28px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-paper/[0.06]"
        >
          <div
            inert={drawn}
            aria-hidden={drawn || undefined}
            className="mini-player-card absolute inset-0 flex items-center gap-3 overflow-hidden rounded-[inherit] pl-2 pr-1.5"
          >
            {card}
          </div>
          <div
            ref={pillRef}
            inert={!drawn}
            aria-hidden={!drawn || undefined}
            className="mini-player-pill absolute bottom-0 left-1/2 flex h-10 w-max -translate-x-1/2 items-center gap-2.5 px-1"
          >
            {pill}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Whether the keyboard's focus is on one of the player's own controls. */
function keyboardOn(shell: HTMLElement | null): boolean {
  const active = document.activeElement;
  if (!shell || !active || !shell.contains(active)) return false;
  try {
    return active.matches(":focus-visible");
  } catch {
    return false;
  }
}

/** The name on the pill: one line, cut short before the pill runs long. */
function PillName({ children }: { children: ReactNode }) {
  return <span className="max-w-44 truncate font-sans text-detail font-semibold text-paper">{children}</span>;
}

/** Play, Pause or Stop on the pill: a 32px round face in a 44px touch box. */
function PillButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap-press hit-44 ms-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-paper/[0.08] text-paper ring-1 ring-inset ring-paper/[0.08]"
    >
      {children}
    </button>
  );
}
