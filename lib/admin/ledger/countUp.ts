/**
 * The arithmetic behind components/admin/ledger/CountUp.tsx.
 *
 * A figure on the panel is usually already formatted when it reaches a
 * component: "$1,204.50", "12,480", "3.2%", "84 / 120". CountUp animates
 * the NUMBER inside that string and leaves the rest alone, so it needs to
 * split a formatted value into prefix, number, suffix, and put it back
 * together with the same number of decimals at every frame. That is the
 * whole job of this file, and it is pure so it is tested.
 */

export type NumericSplit = {
  prefix: string;
  value: number;
  decimals: number;
  suffix: string;
  /** Whether the number carried thousands separators. */
  grouped: boolean;
};

const NUM_RE = /-?−?\d[\d,]*(?:\.\d+)?/;

/**
 * Find the first number in a formatted string. Returns null when there is
 * none, in which case the caller renders the text as it is.
 */
export function splitNumeric(text: string): NumericSplit | null {
  const m = NUM_RE.exec(text);
  if (!m) return null;
  const raw = m[0].replace(/−/, "-");
  const value = Number(raw.replace(/,/g, ""));
  if (Number.isNaN(value)) return null;
  const dot = raw.indexOf(".");
  return {
    prefix: text.slice(0, m.index),
    value,
    decimals: dot === -1 ? 0 : raw.length - dot - 1,
    suffix: text.slice(m.index + m[0].length),
    grouped: raw.includes(","),
  };
}

/** Put a split back together at an intermediate value. */
export function joinNumeric(split: NumericSplit, at: number): string {
  const fixed = Math.abs(at).toFixed(split.decimals);
  const [int, frac] = fixed.split(".");
  const grouped = split.grouped ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : int;
  const body = frac !== undefined ? `${grouped}.${frac}` : grouped;
  // A true minus, never a hyphen, for anything that reads as negative.
  const sign = at < 0 && Number(fixed) !== 0 ? "−" : "";
  return `${split.prefix}${sign}${body}${split.suffix}`;
}

/** ease-out cubic, the one curve every ledger animation uses. */
export function easeOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

/** Value at progress t in [0, 1], easing from 0 to the target. */
export function valueAt(target: number, t: number): number {
  return target * easeOut(t);
}
