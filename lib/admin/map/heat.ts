/**
 * The heat map's steps: how many visits make a country one shade darker.
 *
 * Sheet r3-15, Traffic A (the owner's pick, "Traffic looks insane"): each
 * country is filled by its visits in the period, in five rising steps over
 * none, the most visited white with a soft glow (and the ink in Light). The
 * sheet's day drew its steps at 1, 5, 20, 60 and 150 for a top country of
 * 310; this finds steps the same shape for whatever the period holds, so a
 * quiet hour and a busy month both spread across the five.
 *
 * Pure.
 */

/** Round to a number a legend can print: 1 to 9 as they are, then a multiple of 5 on two figures. */
export function niceStep(v: number): number {
  if (!Number.isFinite(v) || v <= 1) return 1;
  if (v < 10) return Math.round(v);
  const unit = 10 ** (Math.floor(Math.log10(v)) - 1);
  return Math.max(10, Math.round(v / unit / 5) * 5 * unit);
}

/**
 * Five thresholds, rising, the first always 1: a country with any visit at
 * all is never drawn as none. The top one sits at half the largest value, so
 * the few countries that carry the period reach the lit step.
 */
export function heatThresholds(max: number): [number, number, number, number, number] {
  const m = Number.isFinite(max) && max > 0 ? max : 1;
  const t = [1, niceStep(m * 0.016), niceStep(m * 0.065), niceStep(m * 0.2), niceStep(m * 0.5)];
  for (let i = 1; i < t.length; i++) if (t[i] <= t[i - 1]) t[i] = t[i - 1] + 1;
  return t as [number, number, number, number, number];
}

/** Which of the six fills a value takes: 0 for none, then 1 to 5. */
export function heatStep(value: number, thresholds: readonly number[]): 0 | 1 | 2 | 3 | 4 | 5 {
  if (!(value > 0)) return 0;
  let step = 1;
  for (let k = 1; k < thresholds.length; k++) if (value >= thresholds[k]) step = k + 1;
  return Math.min(5, step) as 1 | 2 | 3 | 4 | 5;
}
