// The pieces every premium surface shares: the paywall (/pricing, web and the
// Android screen), the /premium showcase, the /plan screen and the upgrade
// sheet. Written 2026-09-28 with the premium redesign, so the four stop being
// four designs: one gold (antique, metallic, app/globals.css .premium-*), one
// set of feature marks keyed by the plan's feature ids (lib/premium/plans.ts),
// one feature row, one primary action.
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

/** The primary premium action: antique gold, dark ink. */
export const PREMIUM_CTA =
  "premium-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-pill px-6 font-sans text-ui font-semibold transition-[transform,background] duration-150 active:scale-[0.99] disabled:opacity-60";

/** The quieter action beside it. */
export const PREMIUM_GHOST =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border border-premium/40 bg-premium/[0.06] px-6 font-sans text-ui font-semibold text-premium-ink transition-colors hover:border-premium/70 hover:bg-premium/[0.12]";

/** A small eyebrow chip in gold: "Purify Plus", "Members", "Most complete". */
export const PREMIUM_CHIP =
  "inline-flex items-center rounded-pill border border-premium/45 bg-premium/[0.10] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-premium-ink";

/** The graphite card background, warmed with a breath of gold at the top. */
export function premiumCardBg(strength: "none" | "soft" | "full" = "soft"): React.CSSProperties {
  const glow =
    strength === "full"
      ? "radial-gradient(120% 80% at 50% 0%, rgba(201,162,90,0.16) 0%, transparent 60%), "
      : strength === "soft"
        ? "radial-gradient(120% 80% at 50% 0%, rgba(201,162,90,0.08) 0%, transparent 60%), "
        : "";
  return {
    background: `${glow}radial-gradient(115% 90% at 88% 8%, rgba(255,255,255,0.05) 0%, transparent 55%), linear-gradient(155deg, #24231f 0%, #1a1917 60%, #141312 100%)`,
  };
}

/** The four-point star, in the metal. */
/** The four-pointed star, as a clip path over a 24-unit box. */
const STAR_SHAPE =
  "polygon(50% 8.33%, 57.08% 42.92%, 91.67% 50%, 57.08% 57.08%, 50% 91.67%, 42.92% 57.08%, 8.33% 50%, 42.92% 42.92%)";

/**
 * Drawn in CSS, not as an SVG gradient. Every star used to define the same
 * gradient id, and a page resolves url(#id) to its first copy. On a phone
 * that copy sat in the desktop nav, which is display: none there, so the
 * header's star painted nothing and the Premium pill showed an empty gap
 * before its word. A gradient clipped to the shape has no id to collide.
 */
export function GoldStar({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0", className)}
      style={{
        width: size,
        height: size,
        clipPath: STAR_SHAPE,
        background: "linear-gradient(180deg, #efd9a3 0%, #c9a25a 55%, #9a7433 100%)",
      }}
    />
  );
}

/** A check in gold: "this is yours". */
export function GoldCheck({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={cn("shrink-0 text-premium", className)}>
      <path d="M20 6 L9 17 L4 12" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SoonPill({ label }: { label: string }) {
  return (
    <span className="ml-2 inline-flex translate-y-[-1px] items-center rounded-pill border border-premium-soft/45 bg-premium-soft/10 px-1.5 py-px align-middle font-sans text-[10px] font-semibold tracking-[0.6px] text-premium-soft">
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
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-premium/[0.08] text-premium-ink ring-1 ring-inset ring-premium/25",
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
