"use client";

// The now-playing bar: what the persistent audio store was always built for.
//
// lib/prayers/persistentAudioStore.ts keeps one HTMLAudioElement at module
// scope, outside the React tree, so playback already survived navigation.
// Its own docstring names this as the missing piece: "future now playing
// surfaces ... can subscribe to the same snapshot". Until now you could
// start the anthem, walk away, and have no way to pause it from anywhere.
//
// MOUNTED IN THE ROOT LAYOUT, not in (app)/layout.tsx. Today lives at
// app/page.tsx, OUTSIDE the (app) route group, so the app layout unmounts
// on every Today tap and a bar mounted there would blink out of existence
// exactly when a reader taps home. The root layout wraps both trees.
//
// Renders nothing at all when nothing is loaded, so it costs an empty
// component on every other surface.

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  pause,
  play,
  unload,
  usePersistentAudio,
} from "@/lib/prayers/persistentAudioStore";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ProgressBar } from "@/components/ui/ProgressBar";

/** Where the full player lives, so the bar can hand off rather than duplicate. */
const PLAYER_HREF = "/prayers/anthem";

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function NowPlayingBar() {
  const { t } = useTranslate();
  const { src, title, artist, playing, currentTime, duration } =
    usePersistentAudio();
  const pathname = usePathname() ?? "/";

  // Nothing loaded: no bar. Also stand down on the anthem page itself,
  // where the full player is already on screen and a bar over it would be
  // two sets of transport controls for one sound.
  if (!src) return null;
  if (pathname.startsWith(PLAYER_HREF)) return null;

  const pct =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      // z-55 keeps it above the tab bar (z-50) so it is never covered, but
      // that alone was the bug: both were pinned to bottom-0, so the player
      // simply painted over the whole tab bar and the app lost its
      // navigation for as long as the anthem played. `now-playing-lift`
      // moves it above the bar inside the native shell (globals.css); on the
      // web there is no tab bar and it stays at the bottom with its own
      // safe-area padding.
      className="now-playing-lift fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] pointer-events-none md:pb-2"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-night-soft/95 px-3 py-2 shadow-[0_4px_18px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <button
          type="button"
          onClick={() => (playing ? pause() : play())}
          aria-label={playing ? t("prayers.pause") : t("prayers.play")}
          className="tap-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-night"
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>

        <Link href={PLAYER_HREF} className="min-w-0 flex-1">
          <p className="truncate font-sans text-detail font-semibold text-paper">
            {title ?? t("prayers.nowPlaying")}
          </p>
          <p className="mt-0.5 truncate font-sans text-caption text-paper/55">
            {artist ? `${artist} · ` : ""}
            {fmt(currentTime)}
            {duration > 0 ? ` / ${fmt(duration)}` : ""}
          </p>
          {/* Decorative: the elapsed and total time sit in the line above,
              so a second announcement of the same number is noise. No label
              means the shared bar renders aria-hidden. 150ms because this
              follows audio position, where the default step would lag. */}
          <ProgressBar
            value={pct / 100}
            height={2}
            tone="paper"
            durationMs={150}
            className="mt-1 rounded-full"
            trackClassName="bg-paper/15"
          />
        </Link>

        <button
          type="button"
          onClick={() => unload()}
          aria-label={t("prayers.dismissPlayer")}
          className="tap-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-paper/55 hover:bg-paper/10 hover:text-paper"
        >
          <CloseGlyph />
        </button>
      </div>
    </div>
  );
}

const glyph = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function PlayGlyph() {
  return (
    <svg {...glyph} width={18} height={18} fill="currentColor" stroke="none">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg {...glyph} width={18} height={18} fill="currentColor" stroke="none">
      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg {...glyph}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
