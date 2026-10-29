import type { FastKind } from "@/lib/calendar/orthodox";

/**
 * The fast on Today as marks (1.8, the owner's pick B of round 12, "Bands"):
 * wine, oil, fish, and meat with dairy and eggs, each lit when the day's rule
 * allows it and struck through when it does not.
 *
 * Read from the calendar's own rule for the day (lib/calendar/orthodox.ts,
 * fastingStatus), never a second reckoning of it:
 *
 *   strict    "No meat, dairy, fish, wine, or oil": all four struck
 *   wine-oil  "Wine and oil allowed": wine and oil lit
 *   fish      "Fish, wine, and oil allowed": all but meat lit
 *   fast      "No meat or dairy" (lib/calendar/fastFoods.ts): all but meat lit
 *
 * Meat, dairy and eggs are one mark, as the app's "not allowed" lines name
 * them together, and no fast day allows them. A day with no fast (fast-free,
 * or no rule at all) has nothing to strike, so it has no marks: its band says
 * the rule in words instead.
 */
export type Food = "wine" | "oil" | "fish" | "meat";
export type FastMark = { food: Food; allowed: boolean };

export const FOODS: readonly Food[] = ["wine", "oil", "fish", "meat"];

const ALLOWED: Record<FastKind, readonly Food[] | null> = {
  strict: [],
  "wine-oil": ["wine", "oil"],
  fish: ["wine", "oil", "fish"],
  fast: ["wine", "oil", "fish"],
  "fast-free": null,
  normal: null,
};

/** The day's marks in the order the band shows them, or null on a day with no fast. */
export function fastMarks(kind: FastKind): FastMark[] | null {
  const allowed = ALLOWED[kind];
  if (!allowed) return null;
  return FOODS.map((food) => ({ food, allowed: allowed.includes(food) }));
}
