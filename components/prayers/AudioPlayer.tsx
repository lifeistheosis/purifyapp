"use client";

// A small, reverent music player. Renders against the persistent audio
// store in `lib/prayers/persistentAudioStore`, which owns a single
// `HTMLAudioElement` at module scope. The audio element is never inserted
// into the React tree, so playback survives page navigation: pressing
// play on the anthem and then walking to /bible/matthew/1 keeps the
// chant going without a beat missed.
//
// Supports play/pause, scrubbing, volume, and loop options:
//   Off  — play once and stop
//   Loop — repeat indefinitely
//   3× / 7× / 12× — repeat a set number of times, then stop
// The repeat counts echo numbers that recur in prayer practice; the rope
// is often told in loops, so the anthem can keep pace.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  setTrack,
  toggle as toggleAudio,
  seek as seekAudio,
  setVolume as setStoreVolume,
  setLoopMode as setStoreLoopMode,
  usePersistentAudio,
  type LoopMode,
} from "@/lib/prayers/persistentAudioStore";

/**
 * One line of lyrics. `time` (seconds) is optional: when present on every
 * line, the panel runs in synced "now-playing" mode (Apple Music / Spotify
 * style), the active line brightens, the rest dim, the view auto-scrolls,
 * and tapping a line seeks to it. With no times, it's a plain scrolling sheet.
 */
export type LyricLine = { time?: number; text: string };

const LOOP_OPTIONS: { value: LoopMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "inf", label: "Loop" },
  { value: 3, label: "3×" },
  { value: 7, label: "7×" },
  { value: 12, label: "12×" },
];

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  title,
  subtitle,
  lyrics,
}: {
  src: string;
  title: string;
  subtitle?: string;
  lyrics?: LyricLine[];
}) {
  const snap = usePersistentAudio();
  const [showLyrics, setShowLyrics] = useState(false);
  const hasLyrics = Array.isArray(lyrics) && lyrics.length > 0;

  // The store treats the same-src case as a no-op (preserves playback
  // position + play state), so re-mounting this component on the same
  // page does not interrupt the audio. A truly different src loads a
  // new track and resets to 0.
  useEffect(() => {
    setTrack(src, { title, artist: "Purify" });
  }, [src, title]);

  // Whether the player's notion of which track is showing matches the
  // store's. If the store is playing a different track than what this
  // page is documenting, the UI shows zeros until setTrack catches up.
  const isThisTrack = snap.src === src || snap.src?.endsWith(src);
  const playing = isThisTrack && snap.playing;
  const current = isThisTrack ? snap.currentTime : 0;
  const duration = isThisTrack ? snap.duration : 0;

  const toggle = useCallback(() => {
    toggleAudio();
  }, []);

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekAudio(Number(e.target.value));
  };

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStoreVolume(Number(e.target.value));
  };

  const seekTo = useCallback((t: number) => {
    seekAudio(t);
    // If the user taps a lyric line while paused, start playback so
    // the line lights up rather than just seeking silently.
    if (!playing) toggleAudio();
  }, [playing]);

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="rounded-lg border border-paper/12 bg-paper/[0.03] p-5 md:p-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="shrink-0 grid h-12 w-12 place-items-center rounded-full border border-gold/40 bg-gold/[0.08] text-gold transition-colors hover:bg-gold/15 hover:text-paper"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-ui text-paper truncate">{title}</p>
          {subtitle && (
            <p className="mt-0.5 font-sans text-caption text-paper/50 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {hasLyrics && (
          <button
            type="button"
            onClick={() => setShowLyrics((v) => !v)}
            aria-pressed={showLyrics}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 font-sans text-caption transition-colors ${
              showLyrics
                ? "border-gold/40 bg-gold/[0.1] text-gold"
                : "border-paper/15 bg-paper/[0.03] text-paper/60 hover:text-paper hover:border-paper/35"
            }`}
          >
            <LyricsIcon />
            Lyrics
          </button>
        )}
      </div>

      {hasLyrics && showLyrics && (
        <LyricsPanel lyrics={lyrics!} current={current} onSeek={seekTo} />
      )}

      {/* Scrubber */}
      <div className="mt-5 flex items-center gap-3">
        <span className="font-sans text-caption tabular-nums text-paper/45 w-9 text-right">
          {fmt(current)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={onSeek}
          aria-label="Seek"
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full accent-[var(--color-gold)]"
          style={{
            background: `linear-gradient(to right, var(--color-gold) ${pct}%, rgba(245,235,210,0.14) ${pct}%)`,
          }}
        />
        <span className="font-sans text-caption tabular-nums text-paper/45 w-9">
          {fmt(duration)}
        </span>
      </div>

      {/* Loop options + volume */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/40">
            Loop
          </span>
          <div className="inline-flex items-center gap-1 rounded-pill border border-paper/12 bg-paper/[0.03] p-1">
            {LOOP_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setStoreLoopMode(opt.value)}
                aria-pressed={snap.loopMode === opt.value}
                className={`rounded-pill px-3 py-1 font-sans text-caption transition-colors ${
                  snap.loopMode === opt.value
                    ? "bg-gold/[0.12] text-gold"
                    : "text-paper/55 hover:text-paper/85"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2">
          <VolumeIcon />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={snap.volume}
            onChange={onVolume}
            aria-label="Volume"
            className="h-1 w-24 cursor-pointer appearance-none rounded-full accent-[var(--color-gold)]"
          />
        </label>
      </div>
    </div>
  );
}

/* ── Lyrics ────────────────────────────────────────────────────────────── */

function LyricsPanel({
  lyrics,
  current,
  onSeek,
}: {
  lyrics: LyricLine[];
  current: number;
  onSeek: (t: number) => void;
}) {
  const synced = lyrics.every((l) => typeof l.time === "number");
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLElement>(null);

  // Index of the active line: the last line whose time has passed.
  let activeIdx = -1;
  if (synced) {
    for (let i = 0; i < lyrics.length; i++) {
      if ((lyrics[i].time ?? 0) <= current + 0.15) activeIdx = i;
      else break;
    }
  }

  // Auto-scroll the active line to the center of the panel (Apple Music feel).
  // Use rect deltas rather than el.offsetTop: offsetTop is relative to the
  // nearest positioned ancestor, which isn't guaranteed to be this scroll box,
  // and using it scrolled the panel straight to the bottom.
  useEffect(() => {
    if (!synced || activeIdx < 0) return;
    const el = activeRef.current;
    const box = containerRef.current;
    if (!el || !box) return;
    const elRect = el.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const delta =
      elRect.top - boxRect.top - (box.clientHeight / 2 - el.clientHeight / 2);
    box.scrollTo({ top: box.scrollTop + delta, behavior: "smooth" });
  }, [activeIdx, synced]);

  // Fade the whole panel in on open.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Top/bottom fade so lines dissolve at the edges as they scroll past.
  const edgeFade =
    "linear-gradient(to bottom, transparent 0, #000 18%, #000 82%, transparent 100%)";

  return (
    <div
      ref={containerRef}
      className={`relative mt-5 max-h-[300px] overflow-y-auto rounded-lg border border-paper/10 bg-night/40 px-5 py-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all duration-700 ease-out ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{ maskImage: edgeFade, WebkitMaskImage: edgeFade }}
    >
      <div className="space-y-4 text-center">
        {lyrics.map((line, i) => {
          const isActive = synced && i === activeIdx;
          const clickable = synced && typeof line.time === "number";
          const dist = synced && activeIdx >= 0 ? Math.abs(i - activeIdx) : 0;
          const cls = [
            "block w-full font-serif leading-[1.5] transition-all duration-700 ease-out",
            clickable ? "cursor-pointer hover:text-paper" : "",
            !synced
              ? "text-ui text-paper/80"
              : isActive
                ? "text-lede font-medium text-gold"
                : `text-ui text-paper ${dist >= 3 ? "blur-[1.2px]" : ""}`,
          ].join(" ");
          // Active line glows and lifts; the rest dim by distance from it.
          const style: React.CSSProperties | undefined = !synced
            ? undefined
            : isActive
              ? {
                  transform: "scale(1.05)",
                  textShadow: "0 0 18px rgba(183,176,163,0.35)",
                }
              : { opacity: Math.max(0.16, 0.62 - dist * 0.13) };
          if (clickable) {
            return (
              <button
                key={i}
                ref={
                  isActive
                    ? (activeRef as React.RefObject<HTMLButtonElement>)
                    : undefined
                }
                type="button"
                onClick={() => onSeek(line.time as number)}
                className={cls}
                style={style}
              >
                {line.text || " "}
              </button>
            );
          }
          return (
            <p
              key={i}
              ref={
                isActive
                  ? (activeRef as React.RefObject<HTMLParagraphElement>)
                  : undefined
              }
              className={cls}
              style={style}
            >
              {line.text || " "}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function LyricsIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M4 6h11" />
      <path d="M4 12h8" />
      <path d="M4 18h6" />
      <circle cx="18" cy="16" r="2.5" />
      <path d="M20.5 16V9l1.5 1.2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-paper/45"
    >
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}
