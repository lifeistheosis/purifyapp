/**
 * The few marks the Tools pages and Strategy share, as he picked them on the
 * r3-17 sheet (2026-10-30): one ink, state by fill, outline and dash, and the
 * one thing on a page that needs him lit with a soft glow.
 *
 * Every value is built on the admin's own tokens (app/admin/admin-theme.css),
 * so the Light palette follows by itself: the glow is white on Dark and a
 * grey shadow of the ink on Light, as the sheet's light row draws it. No hue,
 * no gold.
 */

import type { CSSProperties } from "react";

/** The glow under the one solid thing that is the move (Accept, Do it). */
export const GLOW = "0 0 20px -4px color-mix(in oklab, var(--adm-ink), transparent 45%)";

/** The one box on a page that needs him: an edge in full ink and a soft glow. */
export const LIT: CSSProperties = {
  borderColor: "var(--adm-ink)",
  boxShadow: "0 0 0 1px var(--adm-ink), 0 0 18px -3px color-mix(in oklab, var(--adm-ink), transparent 55%)",
};

/** A caution: something to look at that is not broken. Dashed, in full ink. */
export const WARN_BOX: CSSProperties = { border: "1px dashed var(--adm-ink)" };

/** A failure. Solid, in full ink: the panel's mark for broken. */
export const FAIL_BOX: CSSProperties = { border: "1px solid var(--adm-ink)", boxShadow: "inset 0 0 0 1px var(--adm-ink)" };

export const ink: CSSProperties = { color: "var(--adm-ink)" };
export const ink2: CSSProperties = { color: "var(--adm-ink-2)" };
export const ink3: CSSProperties = { color: "var(--adm-ink-3)" };
export const line: CSSProperties = { borderColor: "var(--adm-line)" };

/** The quiet box every list on these pages sits in: a hairline on the ground. */
export const BOX = "rounded-[var(--adm-radius)] border";
export const BOX_STYLE: CSSProperties = { borderColor: "var(--adm-line)", background: "var(--adm-panel)" };

/** "12 min ago", "3 h ago", "2 d ago": coarse, for a line a person reads. */
export function agoWords(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "";
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
