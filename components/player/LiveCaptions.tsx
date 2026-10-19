"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { captionLines, lineAt, type CaptionLine } from "@/lib/player/captions";
import { currentTimeNow, type CaptionSource } from "@/lib/prayers/persistentAudioStore";
import { cn } from "@/lib/cn";

/**
 * The live captions (1.7): the line being sung large, its words lighting one
 * by one with a soft glow as each is reached, the lines before and after it
 * quiet, and the whole moving up smoothly as the next line begins. A tap on a
 * line goes there. Drawn after the player mock the owner was sent on
 * 2026-10-15 (Homebase/boards/purify-master/r17/mock/player/).
 *
 * The words are painted from a frame loop that reads the audio's own clock
 * (currentTimeNow), not from React state: the snapshot only moves four times
 * a second, which would make the light step instead of glide, and re-rendering
 * every word sixty times a second would cost an older phone its frames. Only
 * the line being sung is touched each frame.
 *
 * Under a line, its sub lines (Chants, 1.7): a transliteration where the
 * script is not Latin, and an English line, smaller and quiet, never lit word
 * by word. They are drawn under every line, as the lyrics apps draw a
 * translation, so nothing moves when the line changes; the one being sung
 * carries its sub lines a little brighter. Each line takes its own direction
 * (dir="auto"), so an Arabic line reads right to left and the Latin
 * transliteration under it left to right.
 */
const DIM = 0.3;
const WAIT = 0.36;
/** Sub lines: the line being sung's, and every other's. */
const SUB_NOW = 0.62;
const SUB_DIM = 0.28;
/** Where the line being sung sits in the box, from the top. */
const ANCHOR = 0.3;

export function LiveCaptions({
  source,
  duration,
  playing,
  position,
  rtl = false,
  onSeek,
  className,
}: {
  source: CaptionSource;
  duration: number;
  playing: boolean;
  /** The snapshot's position, so a seek while paused repaints. */
  position: number;
  rtl?: boolean;
  onSeek: (t: number) => void;
  className?: string;
}) {
  const lines = useMemo(() => captionLines(source, duration), [source, duration]);
  const boxRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const subRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const shown = useRef(-2);

  const settleLines = useCallback(
    (cur: number) => {
      // Every line but the one being sung is quiet, its words all one tone.
      lines.forEach((line: CaptionLine, i) => {
        const sub = subRefs.current[i];
        if (sub) sub.style.color = `rgba(255,255,255,${i === cur ? SUB_NOW : SUB_DIM})`;
        if (i === cur) return;
        for (const el of wordRefs.current[i] ?? []) {
          if (!el) continue;
          el.style.color = `rgba(255,255,255,${DIM})`;
          el.style.textShadow = "none";
        }
      });
      // And the stack moves so the line being sung stands at the anchor.
      const box = boxRef.current;
      const stack = stackRef.current;
      const target = lineRefs.current[Math.max(0, cur)];
      if (box && stack && target) {
        const reduce = document.documentElement.dataset.motion === "reduce";
        stack.style.transition = reduce ? "none" : "transform 560ms cubic-bezier(0.22, 0.8, 0.2, 1)";
        stack.style.transform = `translateY(${Math.round(box.clientHeight * ANCHOR - target.offsetTop)}px)`;
      }
    },
    [lines],
  );

  const paint = useCallback(() => {
    const t = currentTimeNow();
    const cur = lineAt(lines, t);
    if (cur !== shown.current) {
      shown.current = cur;
      settleLines(cur);
    }
    if (cur < 0) return;
    const line = lines[cur];
    const els = wordRefs.current[cur] ?? [];
    line.words.forEach((w, j) => {
      const el = els[j];
      if (!el) return;
      if (t < w.at) {
        el.style.color = `rgba(255,255,255,${WAIT})`;
        el.style.textShadow = "none";
        return;
      }
      const since = t - w.at;
      const o = WAIT + (1 - WAIT) * Math.min(1, since / 0.12);
      const glow = Math.exp(-since / 0.5);
      el.style.color = `rgba(255,255,255,${o.toFixed(3)})`;
      el.style.textShadow =
        glow > 0.02 ? `0 0 ${(10 + 10 * glow).toFixed(1)}px rgba(255,255,255,${(0.55 * glow).toFixed(3)})` : "none";
    });
  }, [lines, settleLines]);

  // While playing, paint every frame; while paused, paint when the position
  // moves (a seek, a tap on a line).
  useEffect(() => {
    if (!playing) {
      paint();
      return;
    }
    let raf = 0;
    const loop = () => {
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, paint, position]);

  // A new set of lines (another language) starts from the top.
  useEffect(() => {
    shown.current = -2;
    paint();
  }, [lines, paint]);

  return (
    <div
      ref={boxRef}
      // The box never scrolls: the stack's transform places the lines. A
      // focused or clicked line can still scroll an overflow-hidden box to
      // itself, which put the line being sung out of sight above the top
      // (found 2026-10-15 with a tap on a line low in the box).
      onScroll={(e) => {
        if (e.currentTarget.scrollTop) e.currentTarget.scrollTop = 0;
      }}
      className={cn("relative overflow-hidden", className)}
      style={{
        maskImage: "linear-gradient(180deg, transparent 0, #000 48px, #000 calc(100% - 80px), transparent 100%)",
        WebkitMaskImage: "linear-gradient(180deg, transparent 0, #000 48px, #000 calc(100% - 80px), transparent 100%)",
      }}
    >
      <div ref={stackRef} className="absolute inset-x-0 top-0 will-change-transform">
        {lines.map((line, i) => (
          <button
            type="button"
            key={`${i}-${line.at}`}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            onClick={() => onSeek(line.at)}
            dir={rtl ? "rtl" : "auto"}
            className="mb-4 block w-full text-start font-serif text-[26px] font-semibold leading-[1.3] text-paper"
          >
            {line.words.map((w, j) => (
              <span
                key={j}
                ref={(el) => {
                  (wordRefs.current[i] ??= [])[j] = el;
                }}
                style={{ color: `rgba(255,255,255,${DIM})` }}
              >
                {w.text}
                {j < line.words.length - 1 ? " " : ""}
              </span>
            ))}
            {line.sub?.length ? (
              <span
                ref={(el) => {
                  subRefs.current[i] = el;
                }}
                className="mt-1.5 block font-sans text-detail font-normal leading-snug"
                style={{ color: `rgba(255,255,255,${SUB_DIM})` }}
              >
                {line.sub.map((s, k) => (
                  <span key={k} dir="auto" className="block">
                    {s}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
