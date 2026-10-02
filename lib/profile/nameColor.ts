import { isNameColor } from "./cosmetics";

/**
 * The class that colours a name (app/globals.css, "Name colours"), or
 * undefined for a plain one. Pure, so every surface that draws a name asks
 * the same question.
 */
export function nameColorClass(id: string | null | undefined): string | undefined {
  return isNameColor(id) ? `name-color name-color-${id}` : undefined;
}
