"use client";

// The mini player (1.7): what is playing, in a slim solid bar just above the
// tab bar, from anywhere in the app. A tap opens Now Playing
// (components/player/NowPlayingSheet.tsx); the play button and the cross work
// in place.
//
// lib/prayers/persistentAudioStore.ts keeps one HTMLAudioElement at module
// scope, outside the React tree, so playback survives navigation, and this
// bar subscribes to the same snapshot.
//
// Drawn from the newest Apple Music and Spotify screens the owner asked to
// take as the reference (2026-10-15): the picture, the name, the button, and
// a thin line along the foot for how far it has played. Solid, with no blur:
// the Android web view drops frames under a blurred layer in the scroll path,
// which is why the bar it replaces lost its backdrop blur here.
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
// sound's own, its name and a Stop, and a tap opens the ambience sheet.

import { useEffect } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { AmbienceButton, AmbienceIcon } from "@/components/player/AmbienceButton";
import { CoverArt } from "@/components/player/CoverArt";
import { Stop } from "@/components/ui/icons/Stop";
import { getAmbienceTrack } from "@/lib/ambience/ambience";
import { stopAmbience, useAmbience } from "@/lib/ambience/player";
import { openAmbience } from "@/lib/ambience/sheet";
import { connectLockScreen } from "@/lib/player/lockScreen";
import { openNowPlaying, useNowPlayingSheet } from "@/lib/player/sheet";
import { pause, play, unload, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

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

  // The floating reader elements (MobileChapterPill, MobileVerseToolbar,
  // MobileWorkPill) sit a fixed distance above the tab bar, which is 0 on the
  // web, so a track playing would bury the pill under this player. Flag the
  // player on <html> while it paints and globals.css lifts them clear via
  // --now-playing-h. Same shape as CartFab's .has-cart-fab.
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.classList.add("has-now-playing");
    return () => root.classList.remove("has-now-playing");
  }, [visible]);

  // The lock screen and the notification's controls (1.8), in the apps only.
  // Here because this bar is mounted once for the whole app (RootFrame).
  useEffect(() => connectLockScreen(), []);

  if (!visible) return null;

  if (soundOnly && sound) {
    const name = t(sound.labelKey);
    return (
      <div
        data-screen-edge="bottom"
        className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] md:pb-2"
      >
        <div className="pointer-events-auto relative mx-auto flex h-14 max-w-md items-center gap-3 overflow-hidden rounded-[14px] bg-night-soft pl-2 pr-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-paper/[0.06]">
          <button
            type="button"
            onClick={() => openAmbience()}
            aria-haspopup="dialog"
            aria-label={t("ambience.playingAria", { sound: name })}
            className="tap-press flex min-w-0 flex-1 items-center gap-3 text-start"
          >
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-paper/10 text-paper">
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
        </div>
      </div>
    );
  }

  const pct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      // z-55 keeps it above the tab bar (z-50) so it is never covered, and
      // `now-playing-lift` moves it ABOVE the bar inside the native shell
      // (globals.css): both pinned to bottom-0 once hid the whole tab bar for
      // as long as the anthem played. On the web there is no tab bar and it
      // stays at the bottom with its own safe-area padding.
      className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] md:pb-2"
      // What stands at the foot of the screen, which a page going to a place
      // keeps clear of (lib/ui/readingPlace.ts). The sound's own bar above too.
      data-screen-edge="bottom"
    >
      <div className="pointer-events-auto relative mx-auto flex h-14 max-w-md items-center gap-3 overflow-hidden rounded-[14px] bg-night-soft pl-2 pr-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-paper/[0.06]">
        <button
          type="button"
          onClick={() => openNowPlaying()}
          aria-label={`${t("prayers.nowPlaying")}: ${title ?? ""}`}
          className="tap-press flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {art ? (
            <CoverArt src={art} fallback={artFallback} size={40} className="size-10 shrink-0 rounded-lg object-[50%_18%]" />
          ) : (
            <span aria-hidden className="size-10 shrink-0 rounded-lg bg-paper/10" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-sans text-detail font-semibold text-paper">
              {title ?? t("prayers.nowPlaying")}
            </span>
            {artist ? <span className="block truncate font-sans text-caption text-paper/55">{artist}</span> : null}
          </span>
        </button>

        {/* A sound under the track: lit, and a tap opens its sheet. */}
        {ambience.playing ? <AmbienceButton variant="bar" /> : null}

        <button
          type="button"
          onClick={() => (playing ? pause() : play())}
          aria-label={playing ? t("prayers.pause") : t("prayers.play")}
          className="tap-press grid h-10 w-10 shrink-0 place-items-center rounded-full text-paper hover:bg-paper/10"
        >
          {playing ? (
            <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
              <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
            </svg>
          ) : (
            <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]" aria-hidden>
              <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
            </svg>
          )}
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

        {/* How far it has played: a thin line along the foot. Decorative, the
            time is in Now Playing. */}
        <span aria-hidden className="absolute inset-x-2.5 bottom-0 h-[2px] rounded-full bg-paper/15">
          <span className="absolute inset-y-0 left-0 rounded-full bg-paper/85" style={{ width: `${pct}%` }} />
        </span>
      </div>
    </div>
  );
}
