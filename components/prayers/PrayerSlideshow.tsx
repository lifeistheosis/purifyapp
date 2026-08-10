"use client";

// Slideshow for the contemplative panel on /prayers. Crossfades between
// a small set of icons of prayer (Christ in Gethsemane, monastic
// prostration, the Father running to the Prodigal Son) every six seconds.
// Pure CSS opacity transitions; no library, no JS animation loop.
//
// Respects prefers-reduced-motion: when set, the slideshow halts on the
// first frame and provides no auto-advance.

import Image from "next/image";
import { useEffect, useState } from "react";

import { useReducedMotion } from "@/lib/ui/motion";
import { cn } from "@/lib/cn";
// The frames moved to a plain data module so the icon rights test can read
// them. A node-environment test cannot import a "use client" component, and
// these four files sit in public/saints/icons/ belonging to no saint, so the
// registry's completeness check has to be able to account for them. The alt
// text and the note about the 2026-07-25 misalignment live there now.
import { SLIDESHOW_FRAMES as FRAMES } from "@/lib/prayers/slideshowFrames";

const FRAME_MS = 6000; // dwell time per frame
const FADE_MS = 1100; // crossfade duration (kept in sync with the className)

function useSlideIndex(count: number) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return; // hold on frame 0
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [count, reduced]);

  return index;
}

/**
 * Hero-mode slideshow. Fills its parent (absolute inset-0, object-cover);
 * use it the same way as <PrayerIcon size="hero" />.
 */
export function PrayerSlideshowHero({
  priority = false,
  className,
}: {
  priority?: boolean;
  className?: string;
}) {
  const index = useSlideIndex(FRAMES.length);
  return (
    <div className={cn("absolute inset-0", className)} aria-hidden>
      {FRAMES.map((f, i) => (
        <Image
          key={f.src}
          src={f.src}
          alt={f.alt}
          fill
          priority={priority && i === 0}
          sizes="100vw"
          className={cn(
            "object-cover object-top transition-opacity ease-in-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * Framed slideshow (gold inner frame, fixed width × height). Drop-in for
 * <PrayerIcon size="lg" /> when a section wants a rotating centerpiece.
 */
export function PrayerSlideshow({
  width = 240,
  height = 320,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const index = useSlideIndex(FRAMES.length);
  return (
    <div
      className={cn(
        "shrink-0 relative rounded-md overflow-hidden border border-[#8a6c2a]/45 shadow-md bg-[#1a1219]",
        className,
      )}
      style={{ width, height }}
      role="img"
      aria-label={FRAMES[index].alt}
    >
      <div
        aria-hidden
        className="absolute inset-1 rounded-sm border border-gold/40 pointer-events-none z-10"
      />
      {FRAMES.map((f, i) => (
        <Image
          key={f.src}
          src={f.src}
          alt={f.alt}
          fill
          priority={i === 0}
          sizes={`${width}px`}
          className={cn(
            "object-cover object-top transition-opacity ease-in-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        />
      ))}
    </div>
  );
}
