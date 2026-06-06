"use client";

// A small, reverent music player. Built on a single <audio> element with a
// custom UI so it matches the prayer-book palette rather than the browser's
// default chrome. Supports play/pause, scrubbing, volume, and loop options:
//   Off  — play once and stop
//   Loop — repeat indefinitely
//   3× / 7× / 12× — repeat a set number of times, then stop
//
// The repeat counts echo numbers that recur in prayer practice; the rope is
// often told in loops, so the anthem can keep pace.

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One line of lyrics. `time` (seconds) is optional: when present on every
 * line, the panel runs in synced "now-playing" mode (Apple Music / Spotify
 * style) — the active line brightens, the rest dim, the view auto-scrolls,
 * and tapping a line seeks to it. With no times, it's a plain scrolling sheet.
 */
export type LyricLine = { time?: number; text: string };

type LoopMode = "off" | "inf" | 3 | 7 | 12;

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loop, setLoop] = useState<LoopMode>("off");
  const [showLyrics, setShowLyrics] = useState(false);
  const hasLyrics = Array.isArray(lyrics) && lyrics.length > 0;
  // Remaining replays for a finite loop count. Lives in a ref so the `ended`
  // handler reads the latest value without re-binding the listener.
  const repeatsLeft = useRef(0);

  // Keep <audio>.loop in sync for the indefinite case (browser handles it
  // gaplessly); finite counts are handled in the `ended` listener below.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.loop = loop === "inf";
    repeatsLeft.current = typeof loop === "number" ? loop : 0;
  }, [loop]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      if (repeatsLeft.current > 0) {
        repeatsLeft.current -= 1;
        a.currentTime = 0;
        void a.play();
        return;
      }
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }, []);

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const t = Number(e.target.value);
    a.currentTime = t;
    setCurrent(t);
  };

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    const v = Number(e.target.value);
    setVolume(v);
    if (a) a.volume = v;
  };

  const seekTo = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    setCurrent(t);
    if (a.paused) void a.play();
  }, []);

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="rounded-lg border border-paper/12 bg-paper/[0.03] p-5 md:p-6">
      <audio ref={audioRef} src={src} preload="metadata" />

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
                onClick={() => setLoop(opt.value)}
                aria-pressed={loop === opt.value}
                className={`rounded-pill px-3 py-1 font-sans text-caption transition-colors ${
                  loop === opt.value
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
            value={volume}
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

  return (
    <div
      ref={containerRef}
      className="relative mt-5 max-h-[260px] overflow-y-auto rounded-lg border border-paper/10 bg-night/40 px-5 py-6 [scrollbar-width:thin]"
    >
      <div className="space-y-3 text-center">
        {lyrics.map((line, i) => {
          const isActive = synced && i === activeIdx;
          const isPast = synced && i < activeIdx;
          const clickable = synced && typeof line.time === "number";
          const cls = `block w-full font-serif transition-all duration-300 ${
            clickable ? "cursor-pointer hover:text-paper" : ""
          } ${
            !synced
              ? "text-ui text-paper/80"
              : isActive
                ? "text-lede text-gold"
                : isPast
                  ? "text-ui text-paper/40"
                  : "text-ui text-paper/55"
          }`;
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
              >
                {line.text || " "}
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
            >
              {line.text || "·"}
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
