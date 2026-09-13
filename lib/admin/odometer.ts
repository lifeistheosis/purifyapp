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
  /** Position from the LEFT, which is the order the reels stop in. */
  fromLeft: number;
};

export function columns(text: string): Column[] {
  const chars = [...text];
  const last = chars.length - 1;
  return chars.map((char, i) => ({
    char,
    digit: char >= "0" && char <= "9",
    keyFromRight: last - i,
    fromLeft: i,
  }));
}

/**
 * How many copies of 0-9 the strip carries.
 *
 * A reel that spins has to have something to spin THROUGH. With one copy the
 * furthest a wheel can travel is nine places, which reads as a slide rather
 * than a spin: that is an odometer, and it is what this was before. Three
 * copies gives every wheel at least two full revolutions before it lands, which
 * is where it stops looking mechanical and starts looking like a machine you
 * would put a coin in.
 *
 * Three rather than more because the strip is real DOM. Ten copies would be
 * three hundred nodes per number for motion nobody can follow past the second
 * rotation anyway.
 */
export const REEL_REPEATS = 3;

/** Items on a strip: three copies of ten digits. */
export const REEL_ITEMS = REEL_REPEATS * 10;

/**
 * Which item the reel comes to rest on, counted from the top of the strip.
 *
 * The LAST copy, so the spin travels the full length rather than stopping in
 * the first tenth. This is also the value the element carries at rest, which is
 * what keeps the number correct when the animation is throttled, skipped, or
 * already over. See the note in Odometer.tsx: truth must not depend on a frame.
 */
export function restIndex(digit: number): number {
  return (REEL_REPEATS - 1) * 10 + digit;
}

/**
 * How long a reel spins before it stops, in milliseconds, by column.
 *
 * Reels land LEFT TO RIGHT, which is the direction a fruit machine stops in and
 * the reason the tension builds: the last reel is the one that decides. The
 * previous version staggered from the right, because an odometer carries from
 * the units up. Opposite animation, opposite order.
 *
 * Each column runs longer than the one before it rather than starting later. A
 * delay would leave a column sitting still while its neighbours spin, which
 * reads as broken; a longer duration keeps every reel moving from the first
 * frame and simply lets the right-hand ones run on.
 */
export function reelDuration(fromLeft: number): number {
  return BASE_SPIN_MS + Math.min(fromLeft, 6) * 180;
}

/** The shortest a reel spins. Long enough to read as a spin, not a jump. */
const BASE_SPIN_MS = 900;
