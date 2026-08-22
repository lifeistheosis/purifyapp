import type { ReactNode } from "react";

/**
 * Rail glyphs, one per tab id.
 *
 * Keyed by id in a separate map rather than added as a field on Tab, so the
 * GROUPS array in AdminShell stays exactly as it was. A tab is defined by
 * what it does, not by what it looks like, and a future group can be added
 * there without touching this file.
 *
 * Hand-rolled at 20x20 on a 1.6 stroke so they sit on the same optical weight
 * as 13px DM Sans beside them. No icon package: eleven glyphs do not justify
 * a dependency, and an inline SVG cannot arrive late and reflow the rail.
 *
 * They exist because the rail had no leading mark at all, so it could only be
 * scanned by reading every label top to bottom.
 */

const S = {
  width: 16,
  height: 16,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const ADMIN_TAB_ICON_FALLBACK: ReactNode = (
  <svg {...S}>
    <circle cx="10" cy="10" r="6.4" />
  </svg>
);

export const ADMIN_TAB_ICONS: Record<string, ReactNode> = {
  // Money at a glance: a dashboard grid.
  overview: (
    <svg {...S}>
      <rect x="2.8" y="2.8" width="6" height="6" rx="1.2" />
      <rect x="11.2" y="2.8" width="6" height="6" rx="1.2" />
      <rect x="2.8" y="11.2" width="6" height="6" rx="1.2" />
      <rect x="11.2" y="11.2" width="6" height="6" rx="1.2" />
    </svg>
  ),
  // Every order: a receipt with a torn foot.
  orders: (
    <svg {...S}>
      <path d="M4.5 2.8h11v14.4l-2.2-1.4-2.15 1.4-2.15-1.4-2.15 1.4-2.35-1.4Z" />
      <path d="M7.6 7.2h4.8M7.6 10.4h4.8" />
    </svg>
  ),
  // Shop, donations, subs: a rising line.
  revenue: (
    <svg {...S}>
      <path d="M2.8 13.6 7.4 9l3.2 3.2 6-6.4" />
      <path d="M13.2 5.8h3.4v3.4" />
    </svg>
  ),
  // Plus and Pro: a renewing cycle.
  subscriptions: (
    <svg {...S}>
      <path d="M3.4 8.2a6.8 6.8 0 0 1 11.3-2.6l2 1.9" />
      <path d="M16.6 11.8a6.8 6.8 0 0 1-11.3 2.6l-2-1.9" />
      <path d="M13.4 7.5h3.3V4.2M6.6 12.5H3.3v3.3" />
    </svg>
  ),
  // Profiles and carts: one person.
  users: (
    <svg {...S}>
      <circle cx="10" cy="6.6" r="3.1" />
      <path d="M3.9 16.6a6.1 6.1 0 0 1 12.2 0" />
    </svg>
  ),
  // Support and shop: a speech bubble.
  messages: (
    <svg {...S}>
      <path d="M17 11.4a2.6 2.6 0 0 1-2.6 2.6H7.2L3 17.2V5.4A2.6 2.6 0 0 1 5.6 2.8h8.8A2.6 2.6 0 0 1 17 5.4Z" />
    </svg>
  ),
  // Campaigns and moderation: more than one person.
  community: (
    <svg {...S}>
      <circle cx="7.4" cy="7" r="2.7" />
      <path d="M2.6 16.2a4.8 4.8 0 0 1 9.6 0" />
      <path d="M13.2 4.7a2.7 2.7 0 0 1 0 5.1M14.4 12.1a4.8 4.8 0 0 1 3 4.1" />
    </svg>
  ),
  // EIKON and marketplace: a shopping bag.
  shop: (
    <svg {...S}>
      <path d="M4.2 6.4h11.6l-.9 10.2H5.1Z" />
      <path d="M7.3 8.6V5.9a2.7 2.7 0 0 1 5.4 0v2.7" />
    </svg>
  ),
  // Monthly drops and claims: a parcel.
  "eikon-box": (
    <svg {...S}>
      <path d="M10 2.9 17 6.5v7L10 17.1 3 13.5v-7Z" />
      <path d="M3 6.5l7 3.6 7-3.6M10 10.1v7" />
    </svg>
  ),
  // Broadcast notifications: a bell.
  push: (
    <svg {...S}>
      <path d="M15.2 13.6H4.8c.9-1 1.4-2.3 1.4-3.7V8.6a3.8 3.8 0 0 1 7.6 0v1.3c0 1.4.5 2.7 1.4 3.7Z" />
      <path d="M8.3 16.2a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  ),
  // Site analytics: a globe.
  traffic: (
    <svg {...S}>
      <circle cx="10" cy="10" r="7.1" />
      <path d="M2.9 10h14.2" />
      <path d="M10 2.9a11 11 0 0 1 0 14.2 11 11 0 0 1 0-14.2Z" />
    </svg>
  ),

  // ── Owner mode ────────────────────────────────────────────────────────
  // Added in v4 when the owner dashboard became three tabs in this rail.
  // Without an entry here a tab falls back to a bare circle, silently, so
  // any new id needs its own glyph or it looks unfinished rather than broken.

  // Where we are: a plumb line. What is, measured.
  "owner-today": (
    <svg {...S}>
      <path d="M10 2.8v9.4" />
      <circle cx="10" cy="14.6" r="2.6" />
      <path d="M6.6 4.6h6.8" />
    </svg>
  ),
  // Projection: a line leaving the axis and continuing past it.
  "owner-model": (
    <svg {...S}>
      <path d="M3 17V3.6" />
      <path d="M3 17h14" />
      <path d="M5.4 13.4 8.6 9.8l2.6 2.2 3.4-4.6" />
      <path d="M14.6 7.4h2.2v2.2" />
    </svg>
  ),
  // Markets: a pin dropped on a place.
  "owner-markets": (
    <svg {...S}>
      <path d="M10 17.4s5.4-4.6 5.4-8.6a5.4 5.4 0 1 0-10.8 0c0 4 5.4 8.6 5.4 8.6Z" />
      <circle cx="10" cy="8.6" r="2.1" />
    </svg>
  ),
};
