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
  strict: { short: "Strict fast", Icon: Wheat, rgb: "224 86 86" },
  "wine-oil": { short: "Wine & oil", Icon: Grapes, rgb: "214 158 78" },
  fish: { short: "Fish allowed", Icon: Fish, rgb: "96 184 172" },
  fast: { short: "Fast", Icon: Wheat, rgb: "212 175 110" },
  "fast-free": { short: "Fast-free", Icon: Lampada, rgb: "40 200 140" },
  normal: { short: "No fast", Icon: null, rgb: "183 176 163" },
};
