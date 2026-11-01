"use client";

import { useId, type ReactNode } from "react";

import { LAMPADA_PATHS } from "@/components/ui/icons/Lampada";
import { isDecoration, type Decoration } from "@/lib/profile/cosmetics";

/**
 * The avatar frames, a Purify Plus cosmetic, after Discord's avatar
 * decorations but drawn from the Church's own visual language.
 *
 * Redrawn in 1.8 as the owner's sheet r3-28b draws them (notes 75 and 81,
 * Homebase/boards/purify-master/variants/r3-28b-plus-designs.html and its
 * kit, r3-28-kit.js): tooled metal lit and shaded, enamel between gold lines,
 * a soft light behind the stones and stars. The six always there, the
 * icon's halo, a string of pearls, the martyrs' laurel, Purify's own lit
 * candle, Paschal red with the three-bar cross, the Theotokos' three stars;
 * and the four of the seasons, the Paschal eggs, the Nativity star, the
 * Theophany dove and the Dormition lilies. Gold is Plus only, and this is one
 * of its places (the owner, 2026-10-31: "gold is allowed for the community
 * profiles by the way but only exclusive to plus members";
 * lib/ui/__tests__/noGold.test.ts names this file).
 *
 * Drawn in-house as SVG over a 120 box whose middle circle (r 44) is the
 * avatar itself, so a frame never covers a face. The frame overhangs the
 * avatar by a fifth on every side, may reach past its box (a star's rays),
 * and catches no pointer, so the avatar under it stays the thing tapped.
 * The shadows and the blur are drawn only where a frame is large enough to
 * show them (a profile, not a feed's row of small pictures).
 *
 * Only the candle moves: its flame breathes under the motion switch and
 * holds still without it (app/globals.css, .af-flame).
 */

const f2 = (n: number) => n.toFixed(2);

/** The gold, tooled: lit, shaded, lit again (r3-28-kit.js, STOPS.gold). */
const GOLD: readonly [number, string][] = [
  [0, "#fff1c9"],
  [0.2, "#ecca7c"],
  [0.45, "#b98a3d"],
  [0.66, "#f2d998"],
  [0.84, "#c49647"],
  [1, "#86602a"],
];
const LIGHT = "#fff3d2";
const DARK = "#5c4115";

type Pt = { x: number; y: number; a: number };

/** Points around the avatar: `n` of them on radius `r`, from `start` degrees across `span`. */
function ring(n: number, r: number, start = -90, span = 360): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + (span * i) / (span === 360 ? n : Math.max(1, n - 1));
    const rad = (a * Math.PI) / 180;
    out.push({ x: 60 + r * Math.cos(rad), y: 60 + r * Math.sin(rad), a });
  }
  return out;
}

/** An eight-pointed star centred on x, y. */
function star8(x: number, y: number, s: number, inner = 0.45): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const r = i % 2 === 0 ? s : s * inner;
    pts.push(`${f2(x + r * Math.cos(a))},${f2(y + r * Math.sin(a))}`);
  }
  return pts.join(" ");
}

/** The three-bar cross of Purify's mark, `h` tall, centred on x, y, its foot bar raised on the left. */
function Cross3({ x, y, h, fill, stroke }: { x: number; y: number; h: number; fill: string; stroke: string }) {
  const k = h / 176;
  return (
    <g transform={`translate(${f2(x - 50 * k)} ${f2(y - 88 * k)}) scale(${f2(k)})`} fill={fill} stroke={stroke} strokeWidth={f2(0.5 / k)}>
      <rect x="41" y="2" width="18" height="172" rx="2" />
      <rect x="22" y="20" width="56" height="15" rx="2" />
      <rect x="0" y="55" width="100" height="16" rx="2" />
      <rect x="22" y="131" width="56" height="15" rx="2" transform="rotate(18 50 138)" />
    </g>
  );
}

// ── The geometry, worked out once ─────────────────────────────────────────

const HALO_DOTS = ring(48, 49.6);
const HALO_RINGS = ring(12, 49.6, -90);
const PEARLS = ring(28, 50);
const PEARL_BEADS = ring(28, 50, -90 + 360 / 56);

/** The martyrs' crown: two branches of pointed leaves rising from a bow at the foot, open at the brow. */
const LAUREL = (() => {
  const R = 50.6;
  const at = (a: number) => ({ x: 60 + R * Math.cos((a * Math.PI) / 180), y: 60 + R * Math.sin((a * Math.PI) / 180) });
  const leaves: { x: number; y: number; ang: number; s: number }[] = [];
  const berries: { x: number; y: number }[] = [];
  const branch = (from: number, to: number, side: "l" | "r") => {
    const n = 13;
    const step = (to - from) / (n - 1);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const a = from + step * i;
      const s = 11.2 - t * 4.6;
      const p = at(a);
      leaves.push({ ...p, ang: side === "l" ? a + 52 : a - 52, s });
      if (i < n - 1) {
        const q = at(a + step * 0.5);
        leaves.push({ ...q, ang: side === "l" ? a + step * 0.5 + 118 : a + step * 0.5 - 118, s: s * 0.86 });
      }
      if (i % 4 === 2) {
        const b = at(a + step * 0.25);
        berries.push({ x: b.x + (60 - b.x) * 0.06, y: b.y + (60 - b.y) * 0.06 });
      }
    }
    const tip = at(to + step * 0.6);
    leaves.push({ ...tip, ang: side === "l" ? to + 90 : to - 90, s: 6 });
  };
  branch(102, 246, "l");
  branch(78, -66, "r");
  const arc = (a1: number, a2: number, sweep: 0 | 1) => {
    const p1 = at(a1);
    const p2 = at(a2);
    return `M${f2(p1.x)} ${f2(p1.y)} A ${R} ${R} 0 0 ${sweep} ${f2(p2.x)} ${f2(p2.y)}`;
  };
  return { leaves, berries, stems: [arc(99, 250, 1), arc(81, -70, 0)] };
})();

const EGGS = ring(5, 50.5, 56, 68);
const NIGHT_SPECKS = [-140, -112, -40, -68, 160, 20, 130, 50].map((a) => ring(1, 49.2, a)[0]);
const STAR_POINTS = [ring(1, 49.2, -90)[0], ring(1, 49.2, 140)[0], ring(1, 49.2, 40)[0]];

/** The waters of the Jordan round the ring: thirty small waves. */
const JORDAN_WAVE = (() => {
  let d = "";
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * Math.PI * 2;
    const r = 52.6 + 0.9 * Math.sin(a * 30);
    d += `${i ? "L" : "M"}${f2(60 + r * Math.cos(a))} ${f2(60 + r * Math.sin(a))}`;
  }
  return `${d}Z`;
})();

const DOVE = "M0 -1.5 C -3 -6, -9 -7, -12 -3.5 C -8 -4, -5 -2.5, -3 0 C -4 2.5, -3 5, 0 6.5 C 3 5, 4 2.5, 3 0 C 5 -2.5, 8 -4, 12 -3.5 C 9 -7, 3 -6, 0 -1.5 Z";

// ── The drawing ───────────────────────────────────────────────────────────

function Stops({ stops }: { stops: readonly [number, string][] }) {
  return (
    <>
      {stops.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </>
  );
}

function Lily({ a, flip, gold }: { a: number; flip: boolean; gold: string }) {
  const p = ring(1, 50.2, a)[0];
  return (
    <g transform={`translate(${f2(p.x)} ${f2(p.y)}) rotate(${flip ? -22 : 22}) scale(1.55)`}>
      <path d="M0 9 C0 4 .4 1 0 -2" stroke="#7a9566" strokeWidth="1" fill="none" />
      <path d="M0 6 C-3 5 -5 3 -6 .5 C-3 1.5 -1.5 3 0 5" fill="#8aa676" opacity="0.9" />
      <path d="M0 -2 C -2.4 -6, -6.4 -6.8, -7.4 -10.2 C -3.4 -9.4, -1.2 -8.4, 0 -6 Z" fill="#fbf8f0" stroke="#c9bf9f" strokeWidth="0.35" />
      <path d="M0 -2 C 2.4 -6, 6.4 -6.8, 7.4 -10.2 C 3.4 -9.4, 1.2 -8.4, 0 -6 Z" fill="#fbf8f0" stroke="#c9bf9f" strokeWidth="0.35" />
      <path d="M0 -2 C -1.6 -7.2, -1.1 -11.4, 0 -13.6 C 1.1 -11.4, 1.6 -7.2, 0 -2 Z" fill="#fff" stroke="#c9bf9f" strokeWidth="0.35" />
      <path d="M0 -5 l-1.6 -3.4 M0 -5 l1.6 -3.4 M0 -5 v-4" stroke="#b98a3d" strokeWidth="0.45" />
      <circle cx="-1.6" cy="-8.5" r="0.6" fill={gold} />
      <circle cx="1.6" cy="-8.5" r="0.6" fill={gold} />
      <circle cx="0" cy="-9.2" r="0.6" fill={gold} />
    </g>
  );
}

/** The defs a kind draws with, and its art. `fine` draws the shadows and the halo's blur. */
function frameArt({ kind, id, fine }: { kind: Decoration; id: string; fine: boolean }): { defs: ReactNode; art: ReactNode } {
  const M = `url(#${id}m)`;
  const W = `url(#${id}w)`;
  const shadow = fine ? `url(#${id}s)` : undefined;
  switch (kind) {
    case "halo":
      // The nimbus of an icon: tooled gold, finer punched dots, an engraved
      // edge and a soft light behind it.
      return {
        defs: null,
        art: (
          <>
            {fine ? <circle cx="60" cy="60" r="50" fill="none" stroke="#e8c77c" strokeWidth="7" opacity="0.28" filter={`url(#${id}b)`} /> : null}
            <circle cx="60" cy="60" r="49.6" fill="none" stroke={M} strokeWidth="5.4" />
            <circle cx="60" cy="60" r="46.75" fill="none" stroke={DARK} strokeWidth="0.6" opacity="0.85" />
            <circle cx="60" cy="60" r="52.45" fill="none" stroke={DARK} strokeWidth="0.55" opacity="0.8" />
            {HALO_DOTS.map((p, i) => (
              <circle key={i} cx={f2(p.x)} cy={f2(p.y)} r="0.62" fill={LIGHT} opacity="0.95" />
            ))}
            {HALO_RINGS.map((p, i) => (
              <circle key={`r${i}`} cx={f2(p.x)} cy={f2(p.y)} r="1.25" fill="none" stroke={DARK} strokeWidth="0.35" opacity="0.7" />
            ))}
          </>
        ),
      };
    case "pearls":
      // Twenty-eight pearls, each catching its own light, small gold beads between.
      return {
        defs: (
          <radialGradient id={`${id}p`} cx="0.34" cy="0.3" r="0.85">
            <Stops stops={[[0, "#ffffff"], [0.32, "#f6f4f8"], [0.7, "#d2cfd8"], [1, "#8f8b97"]]} />
          </radialGradient>
        ),
        art: (
          <>
            <circle cx="60" cy="60" r="50" fill="none" stroke={M} strokeWidth="0.7" opacity="0.9" />
            <g filter={shadow}>
              {PEARLS.map((p, i) => (
                <circle key={i} cx={f2(p.x)} cy={f2(p.y)} r="3.35" fill={`url(#${id}p)`} />
              ))}
            </g>
            {PEARLS.map((p, i) => (
              <circle key={`h${i}`} cx={f2(p.x - 1.05)} cy={f2(p.y - 1.1)} r="0.85" fill="#fff" opacity="0.95" />
            ))}
            {PEARL_BEADS.map((p, i) => (
              <circle key={`b${i}`} cx={f2(p.x)} cy={f2(p.y)} r="0.95" fill={M} />
            ))}
          </>
        ),
      };
    case "laurel":
      // The martyrs' crown: pointed leaves with their veins and berries, open
      // at the brow, tied with a bow at the foot.
      return {
        defs: (
          <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0">
            <Stops stops={[[0, "#fcecbb"], [0.5, "#d8ad5e"], [1, "#8a6529"]]} />
          </linearGradient>
        ),
        art: (
          <g filter={shadow}>
            {LAUREL.stems.map((d, i) => (
              <path key={`s${i}`} d={d} fill="none" stroke="#8b6427" strokeWidth="1.15" />
            ))}
            {LAUREL.leaves.map((l, i) => (
              <g key={i} transform={`translate(${f2(l.x)} ${f2(l.y)}) rotate(${f2(l.ang)})`}>
                <path
                  d={`M0 0 C ${f2(l.s * 0.2)} ${f2(-l.s * 0.44)}, ${f2(l.s * 0.7)} ${f2(-l.s * 0.42)}, ${f2(l.s)} 0 C ${f2(l.s * 0.7)} ${f2(l.s * 0.3)}, ${f2(l.s * 0.22)} ${f2(l.s * 0.3)}, 0 0 Z`}
                  fill={`url(#${id}l)`}
                  stroke={DARK}
                  strokeWidth="0.3"
                />
                <path d={`M${f2(l.s * 0.08)} 0 Q ${f2(l.s * 0.5)} ${f2(-l.s * 0.07)} ${f2(l.s * 0.9)} 0`} fill="none" stroke={DARK} strokeWidth="0.28" opacity="0.7" />
              </g>
            ))}
            {LAUREL.berries.map((b, i) => (
              <circle key={`b${i}`} cx={f2(b.x)} cy={f2(b.y)} r="1.15" fill={M} stroke={DARK} strokeWidth="0.25" />
            ))}
            <path
              d="M60 110.4 c-3.6-4.2-8.4-3.6-7 .5 c1.1 3 5.4 1.1 7-.5 z M60 110.4 c3.6-4.2 8.4-3.6 7 .5 c-1.1 3-5.4 1.1-7-.5 z"
              fill={M}
              stroke={DARK}
              strokeWidth="0.35"
            />
            <path d="M58.6 111.3 l-3 6.6 M61.4 111.3 l3 6.6" stroke={M} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="60" cy="110.8" r="1.9" fill={M} stroke={DARK} strokeWidth="0.35" />
          </g>
        ),
      };
    case "candle":
      // Purify's own lit candle (components/ui/icons/Lampada.tsx) standing on
      // a gold ring. Its flame breathes.
      return {
        defs: (
          <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="0">
            <Stops stops={[[0, "#ffffff"], [0.6, "#ecebef"], [1, "#bdbcc4"]]} />
          </linearGradient>
        ),
        art: (
          <>
            <circle cx="60" cy="60" r="49.3" fill="none" stroke={M} strokeWidth="2" />
            <circle cx="60" cy="60" r="51.8" fill="none" stroke={M} strokeWidth="0.6" opacity="0.55" />
            <circle cx="60" cy="60" r="47.4" fill="none" stroke={DARK} strokeWidth="0.5" opacity="0.7" />
            {/* The candle at the lower right: 98.2 across, standing on 92.6, 1.75 times the icon. */}
            <g transform="translate(77.2 55.85) scale(1.75)">
              <circle className="af-flame-glow" cx="12" cy="5.4" r="7.2" fill={W} opacity="0.85" />
              <path d={`${LAMPADA_PATHS.taper} Z`} fill={`url(#${id}t)`} stroke="#8d8c95" strokeWidth="0.3" />
              <path d={LAMPADA_PATHS.wick} stroke="#3a3a40" strokeWidth="0.55" strokeLinecap="round" />
              <path className="af-flame" d={LAMPADA_PATHS.flame} fill="#fff" />
              <path d="M8.6 21 H15.4" stroke={M} strokeWidth="1.1" strokeLinecap="round" />
            </g>
          </>
        ),
      };
    case "paschal":
      // Paschal red in enamel between two gold lines, the three-bar cross at the brow.
      return {
        defs: (
          <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
            <Stops stops={[[0, "#e0525a"], [0.45, "#a71f28"], [1, "#5f0d14"]]} />
          </linearGradient>
        ),
        art: (
          <>
            <circle cx="60" cy="60" r="49.2" fill="none" stroke={`url(#${id}r)`} strokeWidth="5.6" />
            <circle cx="60" cy="60" r="51.3" fill="none" stroke="#ff9a9a" strokeWidth="0.45" opacity="0.55" />
            <circle cx="60" cy="60" r="46.1" fill="none" stroke="#2a0306" strokeWidth="0.6" opacity="0.9" />
            <circle cx="60" cy="60" r="45.5" fill="none" stroke={M} strokeWidth="0.55" />
            <circle cx="60" cy="60" r="52.6" fill="none" stroke={M} strokeWidth="0.8" />
            <circle cx="60" cy="10" r="12" fill={W} opacity="0.4" />
            <g filter={shadow}>
              <Cross3 x={60} y={10.5} h={21} fill={M} stroke={DARK} />
            </g>
          </>
        ),
      };
    case "stars":
      // The Theotokos' veil in blue enamel: a star at the brow and one on each shoulder.
      return {
        defs: (
          <linearGradient id={`${id}v`} x1="0" y1="0" x2="1" y2="1">
            <Stops stops={[[0, "#4d76bd"], [0.45, "#24447a"], [1, "#11234a"]]} />
          </linearGradient>
        ),
        art: (
          <>
            <circle cx="60" cy="60" r="49.2" fill="none" stroke={`url(#${id}v)`} strokeWidth="6" />
            <circle cx="60" cy="60" r="51.6" fill="none" stroke="#a9c4f2" strokeWidth="0.45" opacity="0.6" />
            <circle cx="60" cy="60" r="46.1" fill="none" stroke="#050b1c" strokeWidth="0.6" opacity="0.9" />
            <circle cx="60" cy="60" r="45.5" fill="none" stroke={M} strokeWidth="0.55" />
            <circle cx="60" cy="60" r="52.7" fill="none" stroke={M} strokeWidth="0.8" />
            {STAR_POINTS.map((p, i) => (
              <circle key={`g${i}`} cx={f2(p.x)} cy={f2(p.y)} r={i === 0 ? 12 : 9.5} fill={W} opacity="0.35" />
            ))}
            <g filter={shadow}>
              {STAR_POINTS.map((p, i) => (
                <polygon key={i} points={star8(p.x, p.y, i === 0 ? 8.6 : 7)} fill={M} stroke={DARK} strokeWidth="0.35" />
              ))}
            </g>
          </>
        ),
      };
    case "pascha-eggs":
      // Red eggs gathered at the foot, as they are brought to be blessed on the night of Pascha.
      return {
        defs: (
          <>
            <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
              <Stops stops={[[0, "#e0525a"], [0.45, "#a71f28"], [1, "#5f0d14"]]} />
            </linearGradient>
            <radialGradient id={`${id}e`} cx="0.35" cy="0.3" r="0.85">
              <Stops stops={[[0, "#f26a62"], [0.5, "#b3242b"], [1, "#5e0c12"]]} />
            </radialGradient>
          </>
        ),
        art: (
          <>
            <circle cx="60" cy="60" r="49.2" fill="none" stroke={`url(#${id}r)`} strokeWidth="4" />
            <circle cx="60" cy="60" r="51.7" fill="none" stroke={M} strokeWidth="0.7" />
            <g filter={shadow}>
              {EGGS.map((p, i) => (
                <g key={i} transform={`rotate(${f2(p.a - 90)} ${f2(p.x)} ${f2(p.y)})`}>
                  <ellipse
                    cx={f2(p.x)}
                    cy={f2(p.y + (i === 2 ? 1.2 : 0))}
                    rx={i === 2 ? 5.2 : 4.5}
                    ry={i === 2 ? 6.6 : 5.8}
                    fill={`url(#${id}e)`}
                    stroke="#4a0a0f"
                    strokeWidth="0.35"
                  />
                  <path d={`M${f2(p.x - 3.8)} ${f2(p.y + 0.6)} q1.9-1.7 3.8 0 t3.8 0`} fill="none" stroke="#f3d68a" strokeWidth="0.65" opacity="0.95" />
                  <ellipse cx={f2(p.x - 1.4)} cy={f2(p.y - 2.6)} rx="1.1" ry="1.7" fill="#fff" opacity="0.45" />
                </g>
              ))}
              <Cross3 x={60} y={10.5} h={16} fill={M} stroke={DARK} />
            </g>
          </>
        ),
      };
    case "nativity-star":
      // The star over Bethlehem at the brow of a night-blue ring, small stars along it.
      return {
        defs: (
          <linearGradient id={`${id}n`} x1="0" y1="0" x2="1" y2="1">
            <Stops stops={[[0, "#33508f"], [0.5, "#1a2c57"], [1, "#0c1630"]]} />
          </linearGradient>
        ),
        art: (
          <>
            <circle cx="60" cy="60" r="49.2" fill="none" stroke={`url(#${id}n)`} strokeWidth="4.8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={M} strokeWidth="0.7" />
            {NIGHT_SPECKS.map((p, i) => (
              <polygon key={i} points={star8(p.x, p.y, i % 2 ? 1.6 : 2.2, 0.32)} fill="#fff" opacity={i % 2 ? 0.7 : 0.95} />
            ))}
            <circle cx="60" cy="9" r="15" fill={W} opacity="0.55" />
            <path d="M60 -4 V2 M53 -1 l3 4 M67 -1 l-3 4" stroke="#fff" strokeWidth="0.6" opacity="0.6" strokeLinecap="round" />
            <g filter={shadow}>
              <polygon points={star8(60, 9.5, 9.6, 0.38)} fill={M} stroke={DARK} strokeWidth="0.4" />
            </g>
          </>
        ),
      };
    case "theophany-dove":
      // The Spirit descending as a dove over the waters of the Jordan.
      return {
        defs: (
          <linearGradient id={`${id}j`} x1="0" y1="0" x2="1" y2="1">
            <Stops stops={[[0, "#d6eefc"], [0.45, "#8fc3e6"], [1, "#4f8ab7"]]} />
          </linearGradient>
        ),
        art: (
          <>
            <circle cx="60" cy="60" r="49.2" fill="none" stroke={`url(#${id}j)`} strokeWidth="3.8" />
            <circle cx="60" cy="60" r="46.9" fill="none" stroke="#fff" strokeWidth="0.4" opacity="0.35" />
            <path d={JORDAN_WAVE} fill="none" stroke="#dcefff" strokeWidth="0.7" opacity="0.8" />
            <circle cx="60" cy="9" r="15" fill={W} opacity="0.5" />
            <path d="M60 -3 V1.5 M51.5 -.5 l2.6 3.4 M68.5 -.5 l-2.6 3.4" stroke="#fff" strokeWidth="0.6" opacity="0.55" strokeLinecap="round" />
            <g filter={shadow} transform="translate(60 10.8) scale(1.38)">
              <path d={DOVE} fill="#fff" stroke="#9fc4e0" strokeWidth="0.45" />
              <circle cx="0" cy="-1.6" r="0.55" fill="#3a5a78" />
            </g>
          </>
        ),
      };
    case "dormition-lilies":
      // The white lilies of the Theotokos rising at both sides of a soft gold ring.
      return {
        defs: null,
        art: (
          <>
            <circle cx="60" cy="60" r="49.2" fill="none" stroke={M} strokeWidth="2.8" />
            <circle cx="60" cy="60" r="51.8" fill="none" stroke="#f3eee2" strokeWidth="0.7" opacity="0.75" />
            <circle cx="60" cy="60" r="46.9" fill="none" stroke={DARK} strokeWidth="0.45" opacity="0.7" />
            <g filter={shadow}>
              <Lily a={156} flip={false} gold={M} />
              <Lily a={24} flip gold={M} />
            </g>
          </>
        ),
      };
  }
}

/** A picture this wide or wider shows a frame's shadows and the halo's light. */
const FINE_FROM = 56;

/** The frame alone, sized to sit over an avatar `size` pixels wide. */
export function AvatarFrame({ decoration, size }: { decoration: string | null | undefined; size: number }) {
  const raw = useId();
  if (!isDecoration(decoration)) return null;
  // React ids carry characters that url(#...) does not accept.
  const id = `af${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const outer = size * (120 / 88);
  const inset = (outer - size) / 2;
  const fine = size >= FINE_FROM;
  const { defs, art } = frameArt({ kind: decoration, id, fine });
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={outer}
      height={outer}
      viewBox="0 0 120 120"
      className="pointer-events-none absolute"
      style={{ left: -inset, top: -inset, overflow: "visible" }}
      data-frame={decoration}
    >
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
          <Stops stops={GOLD} />
        </linearGradient>
        <radialGradient id={`${id}w`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {fine ? (
          <>
            <filter id={`${id}b`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
            <filter id={`${id}s`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="0.9" floodColor="#000" floodOpacity="0.7" />
            </filter>
          </>
        ) : null}
        {defs}
      </defs>
      {art}
    </svg>
  );
}
