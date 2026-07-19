"use client";

// The gift casket: a chasse-form reliquary, the shape Orthodox and medieval
// churches use for a saint's relics — a rectangular chest under a gabled
// roof-lid, banded with metal and closed with a beeswax seal.
//
// Drawn as SVG rather than stacked divs so the engraving, the chased edging,
// and the seal's break line stay crisp at any size, and so the lid and the two
// seal halves can be animated as independent groups.
//
// Ornament is additive by level (lib/gifts/presentation.ts): a plain chest at
// level 1 gains bands, corner mounts, jewel bosses, filigree, and finally
// gable finials, so a year of Pro is recognisably a richer object than a month
// of Plus rather than the same box moving differently.
//
// Colour comes from the app's own tokens: near-white #eaeaec for chased metal
// (the `gold` token is a near-white in this monochrome scheme), #f5e6d3 cream
// for the wax. Nothing here is amber.

import type { GiftPresentation } from "@/lib/gifts/presentation";

/** Blend two hex colours. Lets one gradient serve every level's material. */
function mix(from: string, to: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(from);
  const [r2, g2, b2] = p(to);
  const c = (a: number, b: number) =>
    Math.round(a + (b - a) * Math.max(0, Math.min(1, t)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

export function Reliquary({
  presentation,
  phase,
}: {
  presentation: GiftPresentation;
  /** "sealed" idles; "opening" runs the strain, the break, and the burst. */
  phase: "sealed" | "opening";
}) {
  const opening = phase === "opening";
  const { casket, motion } = presentation;
  const gilt = casket.gilt;

  // Timings come from the level, so the same keyframes serve every casket.
  const strainStyle = opening
    ? { animationDuration: `${motion.strainMs}ms` }
    : undefined;
  const lidDelay = motion.strainMs + motion.beatMs;
  const lidStyle = opening
    ? {
        animationDuration: `${motion.lidMs}ms`,
        animationDelay: `${lidDelay}ms`,
        transformOrigin: "100px 100px",
      }
    : { transformOrigin: "100px 100px" };
  const sealStyle = opening
    ? {
        animationDelay: `${Math.max(0, motion.strainMs - 120)}ms`,
        transformOrigin: "100px 108px",
      }
    : { transformOrigin: "100px 108px" };

  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      aria-hidden
      className={opening && motion.strain ? "gift-strain" : opening ? "" : "gift-idle"}
      style={{ overflow: "visible", ...strainStyle }}
    >
      <defs>
        {/* The casket's own material lightens with the level: graphite at the
            bottom, pewter at the top, so the object reads as richer even
            before any ornament is counted. */}
        <linearGradient id="gx-body" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={mix("#32323a", "#8e8e99", casket.metal)} />
          <stop offset="55%" stopColor={mix("#1e1e24", "#55555f", casket.metal)} />
          <stop offset="100%" stopColor={mix("#131318", "#33333c", casket.metal)} />
        </linearGradient>
        <linearGradient id="gx-lid" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={mix("#3b3b43", "#a3a3ad", casket.metal)} />
          <stop offset="60%" stopColor={mix("#232329", "#5f5f6a", casket.metal)} />
          <stop offset="100%" stopColor={mix("#17171c", "#3a3a44", casket.metal)} />
        </linearGradient>
        <linearGradient id="gx-wax" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#f7ecd9" />
          <stop offset="100%" stopColor="#d8c3a2" />
        </linearGradient>
        <linearGradient id="gx-slot" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f4f4f5" stopOpacity="0" />
          <stop offset="50%" stopColor="#f4f4f5" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f4f4f5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Casket body ─────────────────────────────────────────────── */}
      <g
        className={opening ? "gift-casket-settle" : ""}
        style={
          opening
            ? { animationDelay: `${lidDelay}ms`, transformOrigin: "100px 140px" }
            : { transformOrigin: "100px 140px" }
        }
      >
        {/* Light escaping along the join once the lid clears. */}
        {opening ? (
          <rect x="36" y="106" width="128" height="5" fill="url(#gx-slot)" />
        ) : null}

        <rect
          x="36"
          y="108"
          width="128"
          height="62"
          rx="3"
          fill="url(#gx-body)"
          stroke="#eaeaec"
          strokeOpacity={gilt}
          strokeWidth="1.1"
        />

        {/* Raised feet. */}
        {casket.feet ? (
          <g fill="#eaeaec" fillOpacity={gilt * 0.85}>
            <rect x="44" y="170" width="14" height="6" rx="1.5" />
            <rect x="142" y="170" width="14" height="6" rx="1.5" />
          </g>
        ) : null}

        {casket.bands ? (
          <g stroke="#eaeaec" strokeOpacity={gilt * 0.9} strokeWidth="2">
            <line x1="36" y1="118" x2="164" y2="118" />
            <line x1="36" y1="160" x2="164" y2="160" />
          </g>
        ) : null}

        {casket.mounts ? (
          <g fill="#eaeaec" fillOpacity={gilt * 0.95}>
            <rect x="38" y="110" width="11" height="11" rx="1.5" />
            <rect x="151" y="110" width="11" height="11" rx="1.5" />
            <rect x="38" y="157" width="11" height="11" rx="1.5" />
            <rect x="151" y="157" width="11" height="11" rx="1.5" />
          </g>
        ) : null}

        {/* Filigree scrollwork flanking the cross. */}
        {casket.filigree ? (
          <g
            stroke="#eaeaec"
            strokeOpacity={gilt * 0.8}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M64 128 q8 6 0 12 q-8 6 0 12" />
            <path d="M52 132 q6 4 0 8 q-6 4 0 8" />
            <path d="M136 128 q-8 6 0 12 q8 6 0 12" />
            <path d="M148 132 q-6 4 0 8 q6 4 0 8" />
          </g>
        ) : null}

        {/* Engraved three-bar Orthodox cross. Always present: it is the one
            thing that makes this Purify's box and not a generic chest. */}
        <g
          stroke="#eaeaec"
          strokeOpacity={Math.min(0.95, gilt + 0.2)}
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="100" y1="124" x2="100" y2="156" />
          <line x1="91" y1="130" x2="109" y2="130" />
          <line x1="85" y1="138" x2="115" y2="138" />
          <line x1="90" y1="150" x2="110" y2="146" />
        </g>
      </g>

      {/* ── Lid: gabled roof, lifts away as one piece ────────────────── */}
      <g
        className={opening ? "gift-lid-burst" : ""}
        style={lidStyle}
      >
        {casket.lid === "slab" ? (
          // Level 1: a plain flat lid. Squat and unadorned — the silhouette
          // alone tells you this is the humblest box.
          <rect
            x="34"
            y="92"
            width="132"
            height="17"
            rx="2.5"
            fill="url(#gx-lid)"
            stroke="#eaeaec"
            strokeOpacity={gilt}
            strokeWidth="1.4"
          />
        ) : (
          <>
            <path
              d="M30 108 L100 66 L170 108 Z"
              fill="url(#gx-lid)"
              stroke="#eaeaec"
              strokeOpacity={gilt}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <g stroke="#eaeaec" strokeOpacity={gilt * 0.8} strokeWidth="1.4">
              <line x1="100" y1="66" x2="100" y2="108" />
              <line x1="65" y1="87" x2="65" y2="108" />
              <line x1="135" y1="87" x2="135" y2="108" />
            </g>
          </>
        )}

        {/* Jewel bosses set into the roof slopes. */}
        {casket.bosses ? (
          <g>
            {[
              [76, 96],
              [124, 96],
              [100, 82],
            ].map(([cx, cy]) => (
              <g key={`${cx}-${cy}`}>
                <circle cx={cx} cy={cy} r="5.4" fill="#f7ecd9" fillOpacity="0.7" />
                <circle
                  cx={cx}
                  cy={cy}
                  r="5.4"
                  fill="none"
                  stroke="#eaeaec"
                  strokeOpacity={gilt}
                  strokeWidth="1.4"
                />
                <circle cx={cx - 1.6} cy={cy - 1.6} r="1.5" fill="#ffffff" fillOpacity="0.9" />
              </g>
            ))}
          </g>
        ) : null}

        {/* Cresting: a stud on the gable, a full cross at the top level. */}
        {casket.lid === "gable" ? (
          <circle
            cx="100"
            cy={casket.finials ? 64 : 68}
            r={casket.finials ? 4 : 3}
            fill="#eaeaec"
            fillOpacity={casket.finials ? 0.95 : 0.7}
          />
        ) : null}
        {casket.finials ? (
          <g fill="#eaeaec" fillOpacity="0.9">
            {/* Gable-end finials. */}
            <circle cx="30" cy="107" r="4.5" />
            <circle cx="170" cy="107" r="4.5" />
            {/* A cross at the apex, the mark of the grandest casket. */}
            <g stroke="#eaeaec" strokeOpacity="0.95" strokeWidth="2.4" strokeLinecap="round">
              <line x1="100" y1="44" x2="100" y2="62" />
              <line x1="93" y1="51" x2="107" y2="51" />
            </g>
          </g>
        ) : null}
      </g>

      {/* ── Beeswax seal, straddling the join ────────────────────────── */}
      <g style={{ transformOrigin: "100px 108px" }}>
        {motion.sealBreak ? (
          <>
            {/* Cracks into halves that fall off the break line. */}
            <g className={opening ? "gift-seal-left" : ""} style={sealStyle}>
              <path d="M100 96 A12 12 0 0 0 100 120 Z" fill="url(#gx-wax)" />
            </g>
            <g className={opening ? "gift-seal-right" : ""} style={sealStyle}>
              <path d="M100 96 A12 12 0 0 1 100 120 Z" fill="url(#gx-wax)" />
              <path
                d="M100 102 L101.4 107 L106 108 L101.4 109 L100 114 L98.6 109 L94 108 L98.6 107 Z"
                fill="#8a7a5e"
                fillOpacity="0.75"
              />
            </g>
          </>
        ) : (
          // Humbler caskets: the wax simply leaves with the lid.
          <g className={opening ? "gift-seal-right" : ""} style={sealStyle}>
            <circle cx="100" cy="108" r="12" fill="url(#gx-wax)" />
            <path
              d="M100 102 L101.4 107 L106 108 L101.4 109 L100 114 L98.6 109 L94 108 L98.6 107 Z"
              fill="#8a7a5e"
              fillOpacity="0.75"
            />
          </g>
        )}
      </g>
    </svg>
  );
}
