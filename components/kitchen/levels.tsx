import type { ComponentType, SVGProps } from "react";

import { Fish } from "@/components/ui/icons/Fish";
import { Grapes } from "@/components/ui/icons/Grapes";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Wheat } from "@/components/ui/icons/Wheat";
import type { FastLevel, RecipeSeason, RecipeTradition } from "@/lib/trapeza/recipes";

type IconCmp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** Strictest first: the order the catalogue's sections and chips run in. */
export const LEVEL_ORDER: FastLevel[] = ["xerophagy", "oil_wine", "fish", "any"];

export const SEASON_ORDER: RecipeSeason[] = ["any", "lent", "nativity", "apostles", "dormition"];
export const TRADITION_ORDER: RecipeTradition[] = ["any", "greek", "russian", "levantine", "balkan"];

/**
 * Each kind of fast day as the calendar already draws it (components/calendar/
 * fastMeta.tsx): the same glyph and the same colour triplet, so a strict day
 * looks like a strict day on the calendar and in the Kitchen. Colour always
 * rides with the icon and the words, never alone.
 */
export const LEVEL_META: Record<FastLevel, { Icon: IconCmp; rgb: string }> = {
  xerophagy: { Icon: Wheat, rgb: "var(--fast-strict)" },
  oil_wine: { Icon: Grapes, rgb: "var(--fast-wine-oil)" },
  fish: { Icon: Fish, rgb: "var(--fast-fish)" },
  any: { Icon: Lampada, rgb: "var(--fast-free)" },
};

/** Catalog keys for one level: the chip, the section heading, its line. */
export function levelKeys(level: FastLevel) {
  return {
    label: `kitchen.level.${level}.label`,
    title: `kitchen.level.${level}.title`,
    sub: `kitchen.level.${level}.sub`,
  };
}

export function recipeHref(id: string): string {
  return `/kitchen/recipe?id=${encodeURIComponent(id)}`;
}
