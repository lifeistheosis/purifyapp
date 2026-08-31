// The arithmetic behind the admin odometer, kept out of the component so it
// can be tested. vitest.config.ts covers lib/** only, and the one thing in this
// feature that is genuinely easy to get wrong is exactly the thing a browser
// walk cannot show you: which column React reuses when the number changes
// LENGTH.

/** Currency marks that make a value "money", and so worth the register sound. */
const CURRENCY = /[$£€¥₽]/;

export function isMoneyText(text: string): boolean {
  return CURRENCY.test(text);
}

/** A value with no digit in it has nothing to roll ("Not recorded", a dash). */
export function hasDigits(text: string): boolean {
  return /\d/.test(text);
}

/** Thousands separators, so a bare number matches what the cards already show. */
export function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value).toLocaleString() : "0";
  }
  return value;
}

export type Column = {
  char: string;
  /** A rolling wheel, or a static separator / currency mark / sign. */
  digit: boolean;
  /**
   * Position counted from the RIGHT, and therefore the React key.
   *
   * This is the whole reason this module exists. Key by index from the LEFT and
   * 999 -> 1,000 shifts every character one place: React reuses the units
   * column as the thousands column, every wheel animates to a digit that was
   * never next to it, and the number appears to scramble rather than tick over.
   * Keyed from the right, the units wheel stays the units wheel for the life of
   * the card and only the new leading digit mounts.
   */
  keyFromRight: number;
};

export function columns(text: string): Column[] {
  const chars = [...text];
  const last = chars.length - 1;
  return chars.map((char, i) => ({
    char,
    digit: char >= "0" && char <= "9",
    keyFromRight: last - i,
  }));
}

/**
 * Stagger, in milliseconds, for a wheel this far from the right.
 *
 * The units wheel moves first and each wheel to its left follows a beat later,
 * so a carry reads as travelling up the number the way it does on a mechanical
 * counter. Capped, or a seven figure number would still be settling most of a
 * second after the units wheel stopped.
 */
export function wheelDelay(keyFromRight: number): number {
  return Math.min(keyFromRight * 45, 260);
}
