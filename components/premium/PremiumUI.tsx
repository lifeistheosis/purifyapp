// The pieces every premium surface shares: the paywall (/pricing, web and the
// apps' screen), the /premium showcase, the /plan screen and the upgrade
// sheet. Written 2026-09-28 with the premium redesign, so the four stop being
// four designs: one set of feature marks keyed by the plan's feature ids
// (lib/premium/plans.ts), one feature row, one primary action.
//
// 1.7.2, the owner's pick of three paywall directions ("B is the best",
// 2026-10-19): no gold anywhere. He had called even the antique gold "vibe
// coded yellow". The set pieces are black, lit from above, the action is
// white with a soft light under it, and the features stand as small posters
// that open (components/premium/FeatureShowcase.tsx), the reading room's
// manner. The Premium pill in the bars keeps its own look (app/globals.css
// .premium-pill) until he says.
//
// Type is DM Sans and Lora only. Never font-display-serif (DM Serif Display):
// it has been taken back off the app's surfaces twice, and the owner asked
// that the premium redesign not use it.
//
// No hooks and no "use client": server pages (/premium, /pricing) and client
// screens (the paywall, /plan, the sheet) render the same components.

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { PlanFeature } from "@/lib/premium/plans";

/** The primary premium action: white on the dark, its ink the page's, with a soft light under it. */
export const PREMIUM_CTA =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night shadow-[0_12px_40px_-14px_rgba(255,255,255,0.5)] transition-[transform,translate,scale,opacity] duration-150 active:scale-[0.99] disabled:opacity-60";

/** The quieter action beside it. */
export const PREMIUM_GHOST =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper transition-colors hover:border-paper/45 hover:bg-paper/[0.06]";

/** A small chip: "Purify Plus", "Members", "Most complete". */
export const PREMIUM_CHIP =
  "inline-flex items-center rounded-pill border border-paper/25 bg-paper/[0.06] px-2.5 py-0.5 font-sans text-caption font-semibold text-paper/85";

/** The graphite card background, lit softly from above. */
export function premiumCardBg(strength: "none" | "soft" | "full" = "soft"): React.CSSProperties {
  const glow =
    strength === "full"
      ? "radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), "
      : strength === "soft"
        ? "radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 60%), "
        : "";
  return {
    background: `${glow}radial-gradient(115% 90% at 88% 8%, rgba(255,255,255,0.04) 0%, transparent 55%), linear-gradient(155deg, #1f1f22 0%, #18181b 60%, #131315 100%)`,
  };
}

// The four-pointed gold star that marked the premium surfaces is gone with
// the gold (1.7.2): nothing on them is starred any more.

/** A check: "this is yours". */
export function PlusCheck({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={cn("shrink-0 text-paper/85", className)}>
      <path d="M20 6 L9 17 L4 12" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SoonPill({ label }: { label: string }) {
  return (
    <span className="ml-2 inline-flex translate-y-[-1px] items-center rounded-pill border border-paper/25 bg-paper/[0.06] px-1.5 py-px align-middle font-sans text-[10px] font-semibold tracking-[0.6px] text-paper/70">
      {label}
    </span>
  );
}

/* ── Feature marks, keyed by lib/premium/plans.ts feature ids ─────────── */

const S = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ICONS: Record<string, ReactNode> = {
  // Three verses joined: the passages a verse echoes.
  "cross-refs": (
    <svg {...S}>
      <rect x="3" y="9.5" width="6" height="5" rx="1.2" />
      <rect x="15" y="3.5" width="6" height="5" rx="1.2" />
      <rect x="15" y="15.5" width="6" height="5" rx="1.2" />
      <path d="M9 11.2c2.6 0 3.2-5.2 6-5.2" />
      <path d="M9 12.8c2.6 0 3.2 5.2 6 5.2" />
    </svg>
  ),
  // A lens over an alpha: one Greek word looked for everywhere.
  "word-study": (
    <svg {...S}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.3 15.3 5.2 5.2" />
      <path d="M13 8c-.5 3-1.5 5-3.2 5C8.7 13 8 12 8 10.8 8 9.4 8.9 8.4 10 8.4c1.6 0 2.2 2.6 3.2 4.6" />
    </svg>
  ),
  // An open book with a line written in it.
  journal: (
    <svg {...S}>
      <path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5z" />
      <path d="M12 6.5v13" />
      <path d="M15 9.5h2.5M15 12.5h2.5" />
    </svg>
  ),
  // A calendar with a day ticked.
  plans: (
    <svg {...S}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
      <path d="m9.2 14.6 2 2 3.6-3.8" />
    </svg>
  ),
  "reading-modes": (
    <svg {...S}>
      <path d="M12 3c1.6 1.9 2.4 3.4 2.4 4.6A2.4 2.4 0 0 1 12 10a2.4 2.4 0 0 1-2.4-2.4C9.6 6.4 10.4 4.9 12 3Z" />
      <path d="M8.5 13h7" />
      <path d="M9.5 13v7h5v-7" />
    </svg>
  ),
  sync: (
    <svg {...S}>
      <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.5-4" />
      <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.5 4" />
      <path d="M19.5 3v4h-4M4.5 21v-4h4" />
    </svg>
  ),
  notes: (
    <svg {...S}>
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  ),
  florilegium: (
    <svg {...S}>
      <path d="M12 21v-9" />
      <path d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5z" />
      <path d="M12 15c0-2.6-1.8-4.5-4.5-4.5 0 2.6 1.8 4.5 4.5 4.5z" />
      <circle cx="12" cy="6" r="2.2" />
    </svg>
  ),
  "immersive-history": (
    <svg {...S}>
      <path d="M6 3h12" />
      <path d="M6 21h12" />
      <path d="M7 3v3.5c0 2.5 2.2 3.9 5 5.5 2.8-1.6 5-3 5-5.5V3" />
      <path d="M7 21v-3.5c0-2.5 2.2-3.9 5-5.5 2.8 1.6 5 3 5 5.5V21" />
    </svg>
  ),
  // The three-bar cross the mark itself is drawn with.
  "supporter-mark": (
    <svg {...S}>
      <path d="M12 3.2V20.4" />
      <path d="M9.3 6.9h5.4" />
      <path d="M5.8 10.6h12.4" />
      <path d="M8.6 15.3l6.8 2.2" />
    </svg>
  ),
  // A portrait in a ring: the Discord picture, framed.
  "discord-frames": (
    <svg {...S}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="2.6" />
      <path d="M7.6 17.2c1-2 2.6-3 4.4-3s3.4 1 4.4 3" />
    </svg>
  ),
  // Rain falling from a cloud: a sound under the reading.
  ambience: (
    <svg {...S}>
      <path d="M7.5 14.5h9.8a3.3 3.3 0 0 0 .3-6.6 5 5 0 0 0-9.5 1.1 2.8 2.8 0 0 0-.6 5.5z" />
      <path d="m9 18-.8 2M13 18l-.8 2M17 18l-.8 2" />
    </svg>
  ),
  // A reading saved onto the phone: the player's own Save offline mark (1.8,
  // components/player/SaveOffline.tsx), so the paywall shows what the button is.
  offline: (
    <svg {...S}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  ),
  // A profile card: the banner across its top, the portrait under it (1.8).
  profile: (
    <svg {...S}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18" />
      <circle cx="8.6" cy="13.4" r="2.4" />
      <path d="M13.2 12.4h4.3M13.2 15.4h2.8" />
    </svg>
  ),
  // A bookmark with a turn of the hand: a verse brought back until known.
  remember: (
    <svg {...S}>
      <path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-3.6L6 21V4.5a1 1 0 0 1 1-1z" />
      <path d="M9.5 10.2a2.6 2.6 0 1 1 1 2.1" />
      <path d="m9.4 12.9.1-2.6 2.5.4" />
    </svg>
  ),
  "everything-plus": (
    <svg {...S}>
      <path d="m12 3 9 5-9 5-9-5 9-5z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  ),
  "studio-audio": (
    <svg {...S}>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
    </svg>
  ),
  "eikon-box": (
    <svg {...S}>
      <rect x="4" y="8" width="16" height="4" />
      <path d="M5 12v8h14v-8" />
      <path d="M12 8v12" />
      <path d="M12 8c-1.5 0-4-.5-4-2.5S10.5 3 12 8z" />
      <path d="M12 8c1.5 0 4-.5 4-2.5S13.5 3 12 8z" />
    </svg>
  ),
  "eikon-benefits": (
    <svg {...S}>
      <path d="M12 3H5a2 2 0 0 0-2 2v7l9 9a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L12 3z" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  ),
};

/** A feature's mark in its tile. Unknown ids fall back to the layers mark. */
export function FeatureTile({ id, className }: { id: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-paper/[0.06] text-paper/85 ring-1 ring-inset ring-paper/[0.12]",
        className,
      )}
    >
      {ICONS[id] ?? ICONS["everything-plus"]}
    </span>
  );
}

/** One feature: its mark, its title (with Coming soon when promised, not live), and a line of what it is. */
export function FeatureRow({ item, soonLabel }: { item: PlanFeature; soonLabel: string }) {
  return (
    <li className="flex items-start gap-3.5">
      <FeatureTile id={item.id} />
      <span className="min-w-0 pt-0.5">
        <span className="block font-sans text-ui font-semibold leading-snug text-paper">
          {item.title}
          {item.soon ? <SoonPill label={soonLabel} /> : null}
        </span>
        <span className="mt-0.5 block font-sans text-caption leading-[1.5] text-paper/60">{item.sub}</span>
      </span>
    </li>
  );
}

export function FeatureList({
  items,
  soonLabel,
  columns = 1,
  className,
}: {
  items: PlanFeature[];
  soonLabel: string;
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2 sm:gap-x-6", className)}>
      {items.map((item) => (
        <FeatureRow key={item.id} item={item} soonLabel={soonLabel} />
      ))}
    </ul>
  );
}

/** A feature's mark alone, at any size: the poster's, the opened poster's. */
export function FeatureMark({ id, size = 26, className }: { id: string; size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex", className)} style={{ ["--mark" as string]: `${size}px` }}>
      <span className="contents [&>svg]:h-[var(--mark)] [&>svg]:w-[var(--mark)]">{ICONS[id] ?? ICONS["everything-plus"]}</span>
    </span>
  );
}

/** Where each poster is lit from, in turn, so no two neighbours are lit alike (as the reading room's doors are). */
const POSTER_LIGHT = ["50%", "38%", "62%"];

/** A poster's ground: black with a pool of light, lit from its place in the row. */
export function posterGround(i: number, spread = 85, ground = "#0b0b0e"): string {
  return `radial-gradient(${spread}% 70% at ${POSTER_LIGHT[i % POSTER_LIGHT.length]} 34%, rgba(255,255,255,0.15), rgba(255,255,255,0.04) 55%, rgba(255,255,255,0) 80%), ${ground}`;
}
