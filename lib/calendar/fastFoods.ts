import type { FastKind } from "./orthodox";

/**
 * What a fast day leaves out, said plainly beside what it allows.
 *
 * Every fast rule line already says what is allowed ("Wine and oil allowed",
 * "Fish allowed on weekdays") or, on a strict day, what is not ("No meat,
 * dairy, fish, wine, or oil"). Readers asked for the other half on the days
 * that only say what is allowed: which foods are kept from. The owner said
 * yes to it for 1.7 on 2026-10-15.
 *
 * So a line is returned only where the rule line does not already say it:
 * a strict day already names everything it keeps from, and a day with no
 * fast keeps from nothing. Eggs are named, as they are part of the dairy
 * that a fast keeps from and a reader new to fasting may not know it. The
 * reader's priest still guides the rest, as every fast line in the app says.
 */
export type FastNotAllowedKey = "calendar.fast.not.wineOil" | "calendar.fast.not.fish" | "calendar.fast.not.fast";

export function fastNotAllowedKey(kind: FastKind): FastNotAllowedKey | null {
  switch (kind) {
    case "wine-oil":
      return "calendar.fast.not.wineOil";
    case "fish":
      return "calendar.fast.not.fish";
    case "fast":
      return "calendar.fast.not.fast";
    default:
      // strict: its rule line names it all already; fast-free and normal:
      // nothing is kept from.
      return null;
  }
}
