"use client";

import { useId } from "react";

import { isDecoration, type Decoration } from "@/lib/profile/cosmetics";

/**
 * The avatar frames, a Purify Plus cosmetic, after Discord's avatar
 * decorations but drawn from the Church's own visual language: the gilded
 * nimbus of an icon, a string of pearls, the martyrs' laurel, a beeswax
 * candle, the red of Pascha, and the three stars on the Theotokos' veil.
 *
 * Drawn in-house as SVG over a 120 box whose middle circle (r 44) is the
 * avatar itself, so a frame never covers a face. The frame overhangs the
 * avatar by 18% on every side and catches no pointer, so the avatar under
 * it stays the thing that is tapped.
 *
 * The gold is the house's antique metal (#c9a25a lit to #efd9a3 and shaded
 * to #9a7433), never a flat yellow. Only the candle moves: its flame breathes
 * under the motion switch and holds still without it.
 */

const GOLD = ["#efd9a3", "#c9a25a", "#9a7433"] as const;

/** Points around the avatar: `n` of them on radius `r`, from `start` degrees. */
function ring(n: number, r: number, start = -90, span = 360): { x: number; y: number; a: number }[] {
  const out: { x: number; y: number; a: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + (span * i) / (span === 360 ? n : Math.max(1, n - 1));
    const rad = (a * Math.PI) / 180;
    out.push({ x: 60 + r * Math.cos(rad), y: 60 + r * Math.sin(rad), a });
  }
  return out;
}

/** An eight-pointed star, two squares turned 45 degrees, centred on x, y. */
function star(x: number, y: number, s: number): string {
  const p = (dx: number, dy: number) => `${(x + dx).toFixed(2)},${(y + dy).toFixed(2)}`;
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const r = i % 2 === 0 ? s : s * 0.45;
    pts.push(p(r * Math.cos(a), r * Math.sin(a)));
  }
  return pts.join(" ");
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={GOLD[0]} />
        <stop offset="0.5" stopColor={GOLD[1]} />
        <stop offset="1" stopColor={GOLD[2]} />
      </linearGradient>
      <radialGradient id={`${id}-pearl`} cx="0.35" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#ece6da" />
        <stop offset="1" stopColor="#b9b1a3" />
      </radialGradient>
      <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffd98a" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function Art({ kind, id }: { kind: Decoration; id: string }) {
  const gold = `url(#${id}-gold)`;
  switch (kind) {
    case "halo":
      // The nimbus: a gilded ring with the punched dots icon painters tool
      // into the gold, and a fainter outer edge.
      return (
        <>
          <circle cx="60" cy="60" r="49" fill="none" stroke={gold} strokeWidth="4" />
          <circle cx="60" cy="60" r="55.5" fill="none" stroke={gold} strokeWidth="1" opacity="0.55" />
          {ring(30, 52.4).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.05" fill={GOLD[0]} opacity="0.9" />
          ))}
        </>
      );
    case "pearls":
      return (
        <>
          <circle cx="60" cy="60" r="49.5" fill="none" stroke={gold} strokeWidth="0.9" opacity="0.7" />
          {ring(26, 50).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill={`url(#${id}-pearl)`} stroke="#8a826f" strokeWidth="0.35" />
          ))}
          {ring(26, 50, -90 + 360 / 52).map((p, i) => (
            <circle key={`g${i}`} cx={p.x} cy={p.y} r="1.1" fill={GOLD[1]} />
          ))}
        </>
      );
    case "laurel": {
      // Two branches rising from the foot to either side of the brow, the
      // crown given to the martyrs. Leaves lie along the circle.
      const left = ring(9, 51, 100, 150);
      const right = ring(9, 51, 80, -150);
      const leaf = (p: { x: number; y: number; a: number }, k: string, flip: boolean) => (
        <ellipse
          key={k}
          cx={p.x}
          cy={p.y}
          rx="6.2"
          ry="2.6"
          fill={gold}
          stroke={GOLD[2]}
          strokeWidth="0.4"
          transform={`rotate(${p.a + (flip ? -55 : 55)} ${p.x} ${p.y})`}
        />
      );
      const stem = (from: { x: number; y: number }, to: { x: number; y: number }, sweep: 0 | 1) =>
        `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} A 51 51 0 0 ${sweep} ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
      return (
        <>
          <path d={stem(left[0], left[left.length - 1], 1)} fill="none" stroke={GOLD[2]} strokeWidth="1.2" />
          <path d={stem(right[0], right[right.length - 1], 0)} fill="none" stroke={GOLD[2]} strokeWidth="1.2" />
          {left.map((p, i) => leaf(p, `l${i}`, false))}
          {right.map((p, i) => leaf(p, `r${i}`, true))}
          <circle cx="60" cy="111" r="2.6" fill={gold} />
        </>
      );
    }
    case "candle":
      return (
        <>
          <circle cx="60" cy="60" r="48.5" fill="none" stroke={gold} strokeWidth="2" />
          {/* A beeswax taper at the lower right, its flame breathing. */}
          <g transform="translate(96 82)">
            <circle className="af-flame-glow" cx="0" cy="-15" r="12" fill={`url(#${id}-glow)`} />
            <rect x="-3.2" y="-8" width="6.4" height="22" rx="1.4" fill="#e9d3a1" stroke="#a88a4f" strokeWidth="0.6" />
            <path d="M0 -8 v-2.4" stroke="#3a2c1a" strokeWidth="0.9" strokeLinecap="round" />
            <path
              className="af-flame"
              d="M0 -21 C 3.6 -16.5, 3.4 -12.4, 0 -10.6 C -3.4 -12.4, -3.6 -16.5, 0 -21 Z"
              fill="#ffcf6b"
              stroke="#f0a43a"
              strokeWidth="0.6"
            />
          </g>
        </>
      );
    case "paschal":
      // Paschal red, with the three-bar cross standing at the brow.
      return (
        <>
          <circle cx="60" cy="60" r="49" fill="none" stroke="#b3242b" strokeWidth="4.2" />
          <circle cx="60" cy="60" r="51.6" fill="none" stroke={gold} strokeWidth="0.8" />
          <g transform="translate(60 9)" fill={gold} stroke={GOLD[2]} strokeWidth="0.4">
            <rect x="-1.6" y="-8.5" width="3.2" height="19" rx="0.4" />
            <rect x="-4.2" y="-5.4" width="8.4" height="2.2" rx="0.4" />
            <rect x="-6.4" y="-1.6" width="12.8" height="2.6" rx="0.4" />
            <rect x="-4.2" y="5.2" width="8.4" height="2.1" rx="0.4" transform="rotate(18 0 6.2)" />
          </g>
        </>
      );
    case "stars":
      // The Theotokos' maphorion: deep blue, a star at the brow and one on
      // each shoulder.
      return (
        <>
          <circle cx="60" cy="60" r="49" fill="none" stroke="#24447a" strokeWidth="4.4" />
          <circle cx="60" cy="60" r="51.8" fill="none" stroke={gold} strokeWidth="0.8" />
          {[ring(1, 49, -90)[0], ring(1, 49, 140)[0], ring(1, 49, 40)[0]].map((p, i) => (
            <polygon key={i} points={star(p.x, p.y, 6.4)} fill={gold} stroke={GOLD[2]} strokeWidth="0.4" />
          ))}
        </>
      );
  }
}

/** The frame alone, sized to sit over an avatar `size` pixels wide. */
export function AvatarFrame({ decoration, size }: { decoration: string | null | undefined; size: number }) {
  const raw = useId();
  if (!isDecoration(decoration)) return null;
  // React ids carry characters that url(#...) does not accept.
  const id = `af${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const outer = size * (120 / 88);
  const inset = (outer - size) / 2;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={outer}
      height={outer}
      viewBox="0 0 120 120"
      className="pointer-events-none absolute"
      style={{ left: -inset, top: -inset }}
      data-frame={decoration}
    >
      <Defs id={id} />
      <Art kind={decoration} id={id} />
    </svg>
  );
}
