"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Right-column hero piece. A round portrait of Christ inside a gold
 * halo, revealed on first mount through a three-beat sequence: empty
 * halo → crimson drop falls and splashes → icon fades in.
 *
 * Sequence (1.8s, mount-once):
 *   - hero-drop-fall:    the droplet accelerates downward (0→55%).
 *   - hero-splash-ring:  thin crimson ring on landing (55→85%).
 *   - hero-wash-bloom:   soft crimson radial fills the circle (50→100%).
 *   - hero-icon-fade:    the portrait fades from 0 → 1 starting at
 *                        55% (the moment the drop lands), so the
 *                        viewer sees the drop trigger the reveal.
 *
 * After the intro, `data-intro="done"` is set on the wrapper; the
 * crimson wash settles to a quiet ambient glow and pointer-tilt /
 * cursor-glint take over.
 *
 * Honors `prefers-reduced-motion`: those users skip all four
 * animations via the motion-reduce class variants (set on each
 * layer) and the React state is initialised to "done" so the
 * mask is full from the first paint.
 *
 * Image: `/purify-logo.jpg`, served from public/. The component
 * name is historical (the previous design used the Pantocrator
 * icon); the file now holds the Purify mark, an Orthodox three-bar
 * cross on a black field.
 */

const SIZE = 360; // px square; the lg viewport gives this room
const MAX_TILT = 9; // degrees of rotation at the corner of the icon
const INTRO_MS = 1800;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function HeroChristIcon() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  // First-mount intro: skip entirely if the user prefers reduced motion,
  // else flip introDone after the animation length. The reduced-motion
  // synchronous setState is intentional, it must happen before paint
  // so the user doesn't briefly see the not-yet-revealed state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (prefersReducedMotion()) {
      setIntroDone(true);
      return;
    }
    const t = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(t);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!introDone) return; // no pointer tilt during the intro
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * MAX_TILT * 2, y: px * MAX_TILT * 2 });
  }

  function handleLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      aria-hidden
      data-intro={introDone ? "done" : "playing"}
      className="relative mx-auto select-none"
      style={{
        width: SIZE,
        height: SIZE,
        perspective: 1200,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
    >
      {/* Soft gold halo. Brightens on hover. */}
      <div
        className="absolute inset-0 rounded-full transition-opacity duration-500 motion-reduce:transition-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(212,175,55,0.32) 0%, rgba(212,175,55,0.10) 40%, transparent 70%)",
          filter: "blur(14px)",
          opacity: hovered ? 1 : 0.7,
        }}
      />

      {/* The icon itself, transformed inside its own wrapper so the
          halo doesn't tilt with it. The mask-image bloom is what
          makes the icon "appear from the wash" during the intro. */}
      <div
        ref={ref}
        className="relative w-full h-full rounded-full overflow-hidden border border-gold/45 transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hovered ? 1.03 : 1})`,
          boxShadow:
            "0 0 0 1px rgba(212,175,55,0.18), 0 24px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* The crimson wash. Sits behind the masked icon during the
            intro and settles to a faint ambient glow after. */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full motion-reduce:!opacity-30 motion-reduce:!transform-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(196,47,36,0.42) 0%, rgba(196,47,36,0.18) 55%, transparent 80%)",
            transformOrigin: "center",
            animation: introDone
              ? undefined
              : "hero-wash-bloom 1.8s ease-out forwards",
            // After the intro, settle to a quiet glow.
            opacity: introDone ? 0.3 : undefined,
          }}
        />

        {/* The icon, opacity-faded in once the drop lands. The wrapper
            holds the fade animation; the <Image> inside stays static. */}
        <div
          aria-hidden
          className="absolute inset-0 motion-reduce:!opacity-100"
          style={{
            opacity: introDone ? 1 : 0,
            animation: introDone
              ? undefined
              : "hero-icon-fade 1.8s ease-out forwards",
          }}
        >
          <Image
            src="/purify-logo.jpg"
            alt=""
            width={SIZE}
            height={SIZE}
            priority
            className="w-full h-full object-cover"
            style={{
              // Slightly lift the portrait off the night surface so
              // the gold inks read at rest. Hover tightens further.
              filter: hovered
                ? "saturate(1.12) brightness(1.08) contrast(1.04)"
                : "saturate(1.06) brightness(1.06) contrast(1.04)",
              transition: "filter 0.35s ease-out",
            }}
          />
          {/* A faint upward white wash so the bottom of the portrait
              picks up a quiet rim of light against night. */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(255,255,255,0.06) 0%, transparent 60%)",
            }}
          />
        </div>

        {/* The light-glint following the cursor (post-intro only). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            opacity: hovered && introDone ? 1 : 0,
            background: `radial-gradient(circle at ${50 + tilt.y * 4}% ${50 - tilt.x * 4}%, rgba(255,255,255,0.18) 0%, transparent 35%)`,
          }}
        />
      </div>

      {/* The falling crimson droplet (a small teardrop SVG). Renders
          only while the intro is playing. */}
      {!introDone ? (
        <svg
          aria-hidden
          width="14"
          height="20"
          viewBox="0 0 14 20"
          className="absolute pointer-events-none motion-reduce:hidden"
          style={{
            top: 0,
            left: "50%",
            transformOrigin: "50% 100%",
            animation: "hero-drop-fall 1.8s ease-in forwards",
            // Initial transform placed by the keyframe; this is just
            // for browsers that paint before the first frame.
            transform: "translate(-50%, -260%)",
            filter: "drop-shadow(0 2px 6px rgba(196,47,36,0.55))",
          }}
        >
          <path
            d="M7 0 C 3 7, 0 11, 0 14 a 7 6 0 0 0 14 0 C 14 11, 11 7, 7 0 Z"
            fill="#c1272d"
          />
        </svg>
      ) : null}

      {/* The splash ring (born where the drop lands at the icon center). */}
      {!introDone ? (
        <div
          aria-hidden
          className="absolute pointer-events-none rounded-full border border-crimson/85 motion-reduce:hidden"
          style={{
            top: "50%",
            left: "50%",
            width: SIZE * 0.82,
            height: SIZE * 0.82,
            transform: "translate(-50%, -50%) scale(0)",
            animation: "hero-splash-ring 1.8s ease-out forwards",
          }}
        />
      ) : null}

      {/* Tiny lit-lampada glow under the icon. */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 -bottom-4 h-6 w-32 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(212,175,55,0.35) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
    </div>
  );
}
