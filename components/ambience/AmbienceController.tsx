"use client";

// Background ambience — a small floating control that plays a looping
// soundscape behind the app. Mounted once in the app layout so it persists
// across navigation (the layout doesn't remount on route change), keeping the
// audio uninterrupted as the reader moves around.
//
// Features:
//   - Three tracks, each tap-to-play, tap-active-to-pause, tap-different-to-switch
//   - Gentle 700ms fade in/out so transitions never punch the ear
//   - Volume slider, persisted per device
//   - Sleep timer: cycle 15 / 30 / 60 / Off; the track fades out at the end
//   - Elapsed time on the active track so you can see how long you have been at it
//   - Pause and Resume preserve the chosen track; Stop releases the choice
//
// Pre-release: ungated. When AMBIENCE_GATED flips on, non-subscribers get an
// upgrade prompt instead of playback.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AMBIENCE_TRACKS,
  AMBIENCE_KEYS,
  getAmbienceTrack,
  type AmbienceTrack,
} from "@/lib/ambience/ambience";

const FADE_MS = 700;

// Sleep timer cycle: Off -> 15 min -> 30 min -> 60 min -> Off.
const SLEEP_STEPS = [0, 15, 30, 60] as const;
type SleepMinutes = (typeof SLEEP_STEPS)[number];

function fmtMMSS(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AmbienceController() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);

  // Sleep timer state. `endsAt` is null when off; otherwise the epoch-ms at
  // which playback should fade out. `now` ticks once per second while the
  // timer or the elapsed counter is live.
  const [sleepMinutes, setSleepMinutes] = useState<SleepMinutes>(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);

  // Elapsed-in-session: when playback flips on, capture the start instant;
  // null whenever paused or stopped so a resume starts a fresh count.
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);

  // 1Hz ticker shared by sleep timer countdown and elapsed counter.
  const [now, setNow] = useState(() => Date.now());

  const rootRef = useRef<HTMLDivElement>(null);

  // Restore the last-chosen track + volume after mount (no autoplay — browsers
  // block sound until a user gesture, so we resume on the next tap). Wrapped
  // with the same eslint-disable pattern as ConfirmDialog: this is one-time
  // initialisation from localStorage, not a synchronisation effect, and the
  // react-hooks/set-state-in-effect rule's recommended refactors don't apply.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    try {
      const v = Number(localStorage.getItem(AMBIENCE_KEYS.volume));
      if (Number.isFinite(v) && v >= 0 && v <= 1) setVolume(v);
      const t = localStorage.getItem(AMBIENCE_KEYS.track);
      if (t && getAmbienceTrack(t)) setCurrentId(t);
    } catch {
      /* ignore */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Close the panel on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 1Hz ticker — only runs while there is something live to count down or up.
  useEffect(() => {
    if (endsAt === null && sessionStartedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt, sessionStartedAt]);

  function cancelFade() {
    if (fadeRef.current != null) {
      cancelAnimationFrame(fadeRef.current);
      fadeRef.current = null;
    }
  }

  // Tween audio.volume to a target over FADE_MS; optionally pause at the end.
  const fadeTo = useCallback((target: number, thenPause = false) => {
    const a = audioRef.current;
    if (!a) return;
    cancelFade();
    const from = a.volume;
    const start = performance.now();
    const step = (time: number) => {
      const p = Math.min(1, (time - start) / FADE_MS);
      a.volume = from + (target - from) * p;
      if (p < 1) {
        fadeRef.current = requestAnimationFrame(step);
      } else {
        fadeRef.current = null;
        if (thenPause) a.pause();
      }
    };
    fadeRef.current = requestAnimationFrame(step);
  }, []);

  // Pause: fade out and pause the audio element, but keep `currentId` so the
  // same track can be resumed by tapping its row or the Resume button.
  const pause = useCallback(() => {
    setPlaying(false);
    setSessionStartedAt(null);
    fadeTo(0, true);
  }, [fadeTo]);

  // Stop: a stronger gesture — pause AND clear the selection so the panel
  // returns to its initial "pick a track" state. Also clears any sleep timer.
  const stop = useCallback(() => {
    setPlaying(false);
    setCurrentId(null);
    setSessionStartedAt(null);
    setEndsAt(null);
    setSleepMinutes(0);
    fadeTo(0, true);
    try {
      localStorage.removeItem(AMBIENCE_KEYS.track);
    } catch {
      /* ignore */
    }
  }, [fadeTo]);

  // Play / Resume a track. If the same track is already playing, this acts
  // as a pause. If a different track is chosen, the switch crossfades via
  // the same fade tween.
  const play = useCallback(
    (track: AmbienceTrack) => {
      const a = audioRef.current;
      if (!a) return;
      // Tapping the track that's already playing pauses it (preserving the
      // selection so a second tap resumes from where it stopped).
      if (playing && currentId === track.id) {
        pause();
        return;
      }
      if (currentId !== track.id) {
        a.src = track.src;
        setCurrentId(track.id);
        try {
          localStorage.setItem(AMBIENCE_KEYS.track, track.id);
        } catch {
          /* ignore */
        }
      }
      a.loop = true;
      a.volume = 0;
      void a
        .play()
        .then(() => {
          setPlaying(true);
          setSessionStartedAt(Date.now());
          fadeTo(volume);
        })
        .catch(() => setPlaying(false));
    },
    [playing, currentId, pause, fadeTo, volume],
  );

  // When the sleep timer reaches zero, fade out and reset the timer
  // state. The state flips are deferred via setTimeout(0) so they don't
  // happen inside the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (endsAt === null) return;
    if (now < endsAt) return;
    const tm = setTimeout(() => {
      pause();
      setEndsAt(null);
      setSleepMinutes(0);
    }, 0);
    return () => clearTimeout(tm);
  }, [endsAt, now, pause]);

  function cycleSleep() {
    const idx = SLEEP_STEPS.indexOf(sleepMinutes);
    const next = SLEEP_STEPS[(idx + 1) % SLEEP_STEPS.length];
    setSleepMinutes(next);
    setEndsAt(next === 0 ? null : Date.now() + next * 60_000);
  }

  function onVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setVolume(v);
    const a = audioRef.current;
    if (a && playing) {
      cancelFade();
      a.volume = v;
    }
    try {
      localStorage.setItem(AMBIENCE_KEYS.volume, String(v));
    } catch {
      /* ignore */
    }
  }

  if (!mounted) return null;

  // Live counters derived once per render.
  const elapsedSecs = sessionStartedAt
    ? Math.max(0, Math.floor((now - sessionStartedAt) / 1000))
    : 0;
  const sleepRemainingSecs =
    endsAt !== null ? Math.max(0, Math.floor((endsAt - now) / 1000)) : 0;

  return (
    <div
      ref={rootRef}
      className="fixed left-5 z-40 bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6"
    >
      {/* This audio is pure ambience (fire crackle, instrumental, no
          speech) so there is nothing meaningful to caption — the
          jsx-a11y/media-has-caption rule is disabled here. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" />

      {open && (
        <div className="absolute bottom-14 left-0 w-[19rem] max-w-[80vw] overflow-hidden rounded-xl border border-paper/15 bg-night/95 backdrop-blur shadow-overlay">
          <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
              Ambience
            </p>
            <span className="font-sans text-eyebrow uppercase tracking-[1px] text-gold/70">
              Early access
            </span>
          </div>

          <ul className="px-1.5 pb-1">
            {AMBIENCE_TRACKS.map((t) => {
              const active = currentId === t.id;
              const isPlaying = active && playing;
              const isPaused = active && !playing;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => play(t)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      isPlaying
                        ? "bg-gold/[0.1]"
                        : isPaused
                          ? "bg-paper/[0.04]"
                          : "hover:bg-paper/[0.05]"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                      {isPlaying ? (
                        <Bars />
                      ) : isPaused ? (
                        <PauseDot />
                      ) : (
                        <PlayDot />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={`font-serif text-ui leading-tight truncate ${
                            isPlaying ? "text-gold" : "text-paper/90"
                          }`}
                        >
                          {t.label}
                        </span>
                        {isPlaying && (
                          <span className="shrink-0 font-sans text-eyebrow tabular-nums text-gold/70">
                            {fmtMMSS(elapsedSecs)}
                          </span>
                        )}
                      </span>
                      <span className="block font-sans text-caption text-paper/45 truncate">
                        {t.subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Sleep timer row. Tap to cycle Off -> 15 -> 30 -> 60 -> Off.
              When live, the right side shows the countdown. */}
          <div className="border-t border-paper/10">
            <button
              type="button"
              onClick={cycleSleep}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-paper/[0.04]"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center ${
                    endsAt !== null ? "text-gold" : "text-paper/50"
                  }`}
                >
                  <MoonIcon />
                </span>
                <span className="font-sans text-caption text-paper/65">
                  {sleepMinutes === 0
                    ? "Sleep timer"
                    : `Fade out in ${sleepMinutes} min`}
                </span>
              </span>
              <span className="font-sans text-caption tabular-nums text-paper/45">
                {endsAt !== null ? fmtMMSS(sleepRemainingSecs) : "Off"}
              </span>
            </button>
          </div>

          {/* Volume + transport. Pause and Stop are both available when a
              track is selected; Pause keeps the choice, Stop releases it. */}
          <div className="flex items-center gap-3 border-t border-paper/10 px-4 py-3">
            <VolumeIcon />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={onVolume}
              aria-label="Ambience volume"
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full accent-[var(--color-gold)]"
            />
            {playing ? (
              <button
                type="button"
                onClick={pause}
                className="font-sans text-caption text-paper/55 hover:text-paper transition-colors"
              >
                Pause
              </button>
            ) : currentId ? (
              <button
                type="button"
                onClick={() => {
                  const t = getAmbienceTrack(currentId);
                  if (t) play(t);
                }}
                className="font-sans text-caption text-gold/85 hover:text-gold transition-colors"
              >
                Resume
              </button>
            ) : null}
            {currentId && (
              <button
                type="button"
                onClick={stop}
                className="font-sans text-caption text-paper/40 hover:text-paper/85 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Background ambience"
        aria-expanded={open}
        className={`flex h-11 w-11 items-center justify-center rounded-full border bg-night/85 backdrop-blur shadow-lg transition-colors ${
          playing
            ? "border-gold/50 text-gold"
            : "border-paper/20 text-paper/70 hover:text-paper hover:border-gold/50"
        }`}
      >
        {playing ? <Bars /> : <SpeakerIcon />}
      </button>
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg
      width="15"
      height="15"
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
    </svg>
  );
}

// Three little animated bars to signal a track is playing.
function Bars() {
  return (
    <span className="flex items-end gap-[2px] h-4" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom rounded-full bg-gold motion-safe:animate-[ambience-bar_900ms_ease-in-out_infinite]"
          style={{ height: "100%", animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

function PlayDot() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-paper/40">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

// Paused state: two small bars, dimmed. Visually distinct from the active
// Bars (which animate) and from the idle PlayDot.
function PauseDot() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="text-paper/55"
    >
      <rect x="6" y="5" width="4" height="14" rx="0.5" />
      <rect x="14" y="5" width="4" height="14" rx="0.5" />
    </svg>
  );
}

// Crescent moon, used for the sleep timer. Inherits currentColor.
function MoonIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
    </svg>
  );
}
