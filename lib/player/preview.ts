"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A short preview of a recording (1.7): the part it is known by, played on
 * its own element so the reader's player is never touched. One at a time
 * across the app. Moved here from Pray with chant, which used it first, so a
 * chant's page lists its versions with the same preview.
 *
 * The owner, 2026-10-15: "you just click each chant and it previews like the
 * best, most popular section".
 */
export type PreviewClip = { id: string; src: string; from: number; to: number };

/** The address a preview plays: the file with its stretch as a media
 *  fragment, so the element starts there and stops at its end by itself. */
export function previewSrc(src: string, from: number, to: number): string {
  return `${src}#t=${from},${to}`;
}

let previewEl: HTMLAudioElement | null = null;
function previewAudio(): HTMLAudioElement {
  if (!previewEl) {
    previewEl = new Audio();
    previewEl.preload = "none";
  }
  return previewEl;
}

export function usePreview() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (previewEl) previewEl.pause();
    setPlayingId(null);
    setProgress(0);
  }, []);

  const start = useCallback((clip: PreviewClip) => {
    const a = previewAudio();
    cancelAnimationFrame(raf.current);
    a.pause();
    a.src = previewSrc(clip.src, clip.from, clip.to);
    const { from, to } = clip;
    setPlayingId(clip.id);
    setProgress(0);
    a.play().catch(() => setPlayingId(null));
    const tick = () => {
      const done = (a.currentTime - from) / (to - from);
      setProgress(Math.max(0, Math.min(1, done)));
      // The fragment pauses the element at its end; so does a stop.
      if (a.paused && a.currentTime >= to - 0.25) {
        setPlayingId(null);
        setProgress(0);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      previewEl?.pause();
    },
    [],
  );

  return { playingId, progress, start, stop };
}
