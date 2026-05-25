"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/**
 * Right-column hero piece, replacing the older typographic-accent
 * design. Shows a large square portrait of Christ (the same icon
 * file used elsewhere in the saints registry, public-domain Greek
 * iconography) inside a quiet halo.
 *
 * Interactive on hover:
 *  - The icon tilts subtly toward the cursor (rotateX / rotateY
 *    on a perspective transform), producing a parallax feel like
 *    the surface is catching light from where the reader is
 *    standing.
 *  - The gold halo behind the icon brightens.
 *  - On mouse-leave the icon eases back to flat. No tilt on
 *    devices without a pointer (touch / coarse pointer).
 *
 * The whole surface is decorative (aria-hidden) — the text on the
 * left column carries the meaning. Honors `prefers-reduced-motion`
 * via the inline transition: a user with that preference set
 * gets a static portrait.
 *
 * Image: `/saints/icons/jesus.jpg`, served from public/.
 */
const SIZE = 360; // px square; the lg viewport gives this room
const MAX_TILT = 9; // degrees of rotation at the corner of the icon

export function HeroChristIcon() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Mouse position relative to center, normalized to [-1, 1].
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    // Tilt INTO the cursor (positive y on bottom → tilt forward).
    // Reduce-motion users get the static fallback via CSS.
    setTilt({ x: -py * MAX_TILT * 2, y: px * MAX_TILT * 2 });
  }

  function handleLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      aria-hidden
      className="relative mx-auto select-none"
      style={{
        width: SIZE,
        height: SIZE,
        // perspective creates the 3D space the rotateX/Y reads against.
        perspective: 1200,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
    >
      {/* Soft gold halo behind the icon. Brightens on hover. The
          motion-reduce variant kills the lift transition. */}
      <div
        className="absolute inset-0 rounded-full transition-opacity duration-500 motion-reduce:transition-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(212,175,55,0.28) 0%, rgba(212,175,55,0.08) 40%, transparent 70%)",
          filter: "blur(12px)",
          opacity: hovered ? 1 : 0.65,
        }}
      />

      {/* The icon itself, transformed inside its own wrapper so the
          halo doesn't tilt with it. */}
      <div
        ref={ref}
        className="relative w-full h-full rounded-full overflow-hidden border border-gold/30 shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hovered ? 1.03 : 1})`,
        }}
      >
        <Image
          src="/saints/icons/jesus.jpg"
          alt=""
          width={SIZE}
          height={SIZE}
          priority
          className="w-full h-full object-cover"
          // Slight saturation lift on hover, applied via filter so the
          // motion-reduce media query can leave the base treatment.
          style={{
            filter: hovered ? "saturate(1.08) brightness(1.04)" : "none",
            transition: "filter 0.35s ease-out",
          }}
        />

        {/* Light-glint that follows the cursor: a thin radial
            highlight positioned where the mouse is. Disappears on
            mouse-leave. Decorative only. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            opacity: hovered ? 1 : 0,
            background: `radial-gradient(circle at ${50 + tilt.y * 4}% ${50 - tilt.x * 4}%, rgba(255,255,255,0.18) 0%, transparent 35%)`,
          }}
        />
      </div>

      {/* Tiny lit-lampada glow under the icon. Pure decoration. */}
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
