/**
 * The horizon from the ads and the cards (purify-ads src/brand/parts.tsx,
 * Limb: a planet's edge at night, a thin line brightest at the crest, its glow
 * falling outward only) and the stars above it, drawn once for the two places
 * that show them: the apps' intro (./LaunchFrame.tsx) and the first question
 * of the welcome flow, which carries the intro's night on
 * (components/onboarding/WhereFrom.tsx, the owner's pick "E + I" of
 * 2026-10-28).
 *
 * Shapes only. No words, and no colour of its own: it draws in currentColor
 * and the page's night, so whatever holds it decides the palette. Plain markup
 * with no hooks, so the intro, a server component written into the document,
 * and the onboarding, a client one, both render it.
 */

export type HorizonStar = { left: string; top: string; size: number; opacity: number; delay: number };

/**
 * The same stars on every open: a seeded scatter, kept above the intro's
 * horizon (its crest is at 71% of the screen and it falls away to the sides)
 * and clear of the intro's cross. Faint, a few brighter, as on the cards.
 */
export const HORIZON_STARS: readonly HorizonStar[] = (() => {
  let seed = 11;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: HorizonStar[] = [];
  while (out.length < 34) {
    const x = 3 + rnd() * 94;
    const y = 3 + rnd() * 57;
    const u = rnd();
    const opacity = 0.18 + 0.5 * rnd();
    // Coming out over the first 0.9 s of the intro's build (the owner's
    // slower pace, 2026-10-28), so the sky fills while the horizon is still
    // rising.
    const delay = Math.round(80 + rnd() * 800);
    if (Math.abs(x - 50) < 11 && Math.abs(y - 50) < 9) continue;
    out.push({ left: `${x.toFixed(1)}%`, top: `${y.toFixed(1)}%`, size: Number((1 + 1.5 * u ** 5).toFixed(2)), opacity: Number(opacity.toFixed(2)), delay });
  }
  return out;
})();

/**
 * The horizon itself, in a 1000 unit drawing whose top edge is the crest: the
 * circle, a haze and a glow behind its edge, the planet drawn over their inner
 * half so the light falls outward only, then the edge. `id` names its filters
 * and gradients, so two of them on one page (the intro stays in the apps'
 * document after it lifts) never borrow each other's.
 */
export function HorizonDrawing({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" className={className}>
      <defs>
        <filter id={`${id}-haze`} filterUnits="userSpaceOnUse" x="-300" y="-300" width="1600" height="1600">
          <feGaussianBlur stdDeviation="38" />
        </filter>
        <filter id={`${id}-glow`} filterUnits="userSpaceOnUse" x="-300" y="-300" width="1600" height="1600">
          <feGaussianBlur stdDeviation="7.6" />
        </filter>
        <linearGradient id={`${id}-line`} gradientUnits="userSpaceOnUse" x1="191" y1="0" x2="809" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.13" />
          <stop offset="0.5" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.13" />
        </linearGradient>
        <radialGradient id={`${id}-rim`} gradientUnits="userSpaceOnUse" cx="500" cy="500" r="500">
          <stop offset="0.9" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      <circle cx="500" cy="500" r="500" fill="none" stroke="currentColor" strokeWidth="50" opacity="0.15" filter={`url(#${id}-haze)`} />
      <ellipse cx="500" cy="6" rx="198" ry="38" fill="currentColor" opacity="0.2" filter={`url(#${id}-haze)`} />
      <circle cx="500" cy="500" r="500" fill="none" stroke="currentColor" strokeOpacity="0.85" strokeWidth="4.5" opacity="0.42" filter={`url(#${id}-glow)`} />
      <circle cx="500" cy="500" r="500" style={{ fill: "var(--color-night)" }} />
      <circle cx="500" cy="500" r="500" fill={`url(#${id}-rim)`} />
      <circle cx="500" cy="500" r="500" fill="none" stroke={`url(#${id}-line)`} strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
