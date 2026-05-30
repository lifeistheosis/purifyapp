"use client";

// Slideshow for the contemplative panel on /prayers. Crossfades between
// a small set of icons of prayer (Christ in Gethsemane, monastic
// prostration, the Father running to the Prodigal Son) every six seconds.
// Pure CSS opacity transitions; no library, no JS animation loop.
//
// Respects prefers-reduced-motion: when set, the slideshow halts on the
// first frame and provides no auto-advance.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Frame = { src: string; alt: string };

const FRAMES: Frame[] = [
  {
    src: "/saints/icons/praying2.jpg",
    alt: "An Orthodox monk in prostration before the icon of Christ in his cave.",
  },
  {
    src: "/saints/icons/praying.jpg",
    alt: "An Orthodox monk at prayer with prayer rope.",
  },
  {
    src: "/saints/icons/praying3.jpg",
    alt: "The Agony in the Garden — Christ kneeling at the rock in Gethsemane.",
  },
  {
    src: "/saints/icons/icon4.jpg",
    alt: "The Father receiving the Prodigal Son.",
  },
];

const FRAME_MS = 6000; // dwell time per frame
const FADE_MS = 1100; // crossfade duration (kept in sync with the className)

export function PrayerSlideshow({
  width = 240,
  height = 320,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = mq.matches;
    if (mq.matches) return; // hold on frame 0

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % FRAMES.length);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, []);

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
      {/* Inner gold frame, the Orthodox icon-panel cue (same as PrayerIcon). */}
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
