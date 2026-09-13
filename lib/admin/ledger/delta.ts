/**
 * How a change against the prior period is written.
 *
 * One rule, applied everywhere a delta appears: the sign is a true minus
 * (U+2212) for a fall and a plus for a rise, the colour is decided by the
 * direction alone, and a zero change is neither and takes the muted ink.
 * `invert` is for the few metrics where down is good (churn, refunds,
 * cost): the sign stays truthful and only the colour flips.
 */

export type DeltaTone = "up" | "down" | "flat";

export type DeltaSpec = {
  /** Percentage points, or an absolute change when `suffix` says so. */
  value: number;
  /** "%" by default. Pass "" for an absolute count. */
  suffix?: string;
  /** Down is the good direction for this metric. */
  invert?: boolean;
  /** Decimals to show. Default 1 for percentages, 0 otherwise. */
  decimals?: number;
};

export function deltaTone(d: DeltaSpec): DeltaTone {
  if (d.value === 0 || !Number.isFinite(d.value)) return "flat";
  const up = d.value > 0;
  return (d.invert ? !up : up) ? "up" : "down";
}

export function deltaText(d: DeltaSpec): string {
  const suffix = d.suffix ?? "%";
  const decimals = d.decimals ?? (suffix === "%" ? 1 : 0);
  if (!Number.isFinite(d.value)) return "";
  const body = Math.abs(d.value).toFixed(decimals);
  if (d.value === 0 || Number(body) === 0) return `0${suffix}`;
  return `${d.value < 0 ? "−" : "+"}${body}${suffix}`;
}

/** The CSS colour token for a tone. */
export function deltaColor(tone: DeltaTone): string {
  if (tone === "up") return "var(--adm-up)";
  if (tone === "down") return "var(--adm-down)";
  return "var(--adm-ink-3)";
}
