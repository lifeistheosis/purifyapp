"use client";

// Background ambience — a small floating control that plays a looping
// soundscape behind the app. Mounted once in the app layout so it persists
// across navigation (the layout doesn't remount on route change), keeping the
// audio uninterrupted as the reader moves around.
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

export function AmbienceController() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const rootRef = useRef<HTMLDivElement>(null);

  // Restore the last-chosen track + volume after mount (no autoplay — browsers
  // block sound until a user gesture, so we resume on the next tap).
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
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / FADE_MS);
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

  const stop = useCallback(() => {
    setPlaying(false);
    fadeTo(0, true);
  }, [fadeTo]);

  const play = useCallback(
    (track: AmbienceTrack) => {
      const a = audioRef.current;
      if (!a) return;
      // Tapping the track that's already playing stops it.
      if (playing && currentId === track.id) {
        stop();
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
          fadeTo(volume);
        })
        .catch(() => setPlaying(false));
    },
    [playing, currentId, stop, fadeTo, volume],
  );

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

  return (
    <div
      ref={rootRef}
      className="fixed left-5 z-40 bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6"
    >
      <audio ref={audioRef} preload="none" />

      {open && (
        <div className="absolute bottom-14 left-0 w-[18rem] max-w-[80vw] overflow-hidden rounded-xl border border-paper/15 bg-night/95 backdrop-blur shadow-overlay">
          <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
              Ambience
            </p>
            <span className="font-sans text-eyebrow uppercase tracking-[1px] text-gold/70">
              Early access
            </span>
          </div>
          <ul className="px-1.5 pb-2">
            {AMBIENCE_TRACKS.map((t) => {
              const active = playing && currentId === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => play(t)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      active ? "bg-gold/[0.1]" : "hover:bg-paper/[0.05]"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                      {active ? <Bars /> : <PlayDot />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-serif text-ui leading-tight ${
                          active ? "text-gold" : "text-paper/90"
                        }`}
                      >
                        {t.label}
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
            {playing && (
              <button
                type="button"
                onClick={stop}
                className="font-sans text-caption text-paper/55 hover:text-paper transition-colors"
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
