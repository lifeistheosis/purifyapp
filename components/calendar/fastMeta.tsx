import type { ComponentType, SVGProps } from "react";
import type { FastKind } from "@/lib/calendar/orthodox";
import { Wheat } from "@/components/ui/icons/Wheat";
import { Grapes } from "@/components/ui/icons/Grapes";
import { Fish } from "@/components/ui/icons/Fish";
import { Lampada } from "@/components/ui/icons/Lampada";

type IconCmp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/**
 * Single source of truth for how each fasting register is shown: a bespoke
 * icon + a short label + an "R G B" colour triplet (matching the liturgical
 * tones). Color is always paired with the icon + label, never alone.
 */
export const FAST_META: Record<
  FastKind,
  { short: string; Icon: IconCmp | null; rgb: string }
> = {
  // `rgb` points at a CSS variable rather than carrying the hue. The values
  // live in the :root block beside --ink-rubric in app/globals.css, so the
  // light palette can remap them; hard-coded here they stayed dark-surface
  // colours on a parchment page. The icon and the label are unchanged and
  // stay mandatory: colour is never the sole signal for a fast.
  strict: { short: "Strict fast", Icon: Wheat, rgb: "var(--fast-strict)" },
  "wine-oil": { short: "Wine & oil", Icon: Grapes, rgb: "var(--fast-wine-oil)" },
  fish: { short: "Fish allowed", Icon: Fish, rgb: "var(--fast-fish)" },
  fast: { short: "Fast", Icon: Wheat, rgb: "var(--fast-fast)" },
  "fast-free": { short: "Fast-free", Icon: Lampada, rgb: "var(--fast-free)" },
  normal: { short: "No fast", Icon: null, rgb: "var(--fast-normal)" },
};
