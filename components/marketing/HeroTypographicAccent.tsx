/**
 * Right-column hero accent. Replaces the older `IconCornerCard`
 * (a 9:19 phone-shaped clickable surface) with a still, decorative
 * piece of liturgical type: the doxology in polytonic Greek over
 * its English rendering, breathing gently like an unattended candle.
 *
 *  - No card chrome, no border, no clickable surface.
 *  - Server component, zero JS.
 *  - The Cardo font (already wired in app/layout.tsx for the Greek
 *    interlinear) renders Δόξα τῷ Θεῷ properly.
 *  - Animation reuses the existing `halo-breathe` keyframes from
 *    globals.css; honors `prefers-reduced-motion` via the global
 *    rule already in place.
 *  - Pure black-and-white-plus-gold register: no blue tint, fits
 *    the new home hero surface.
 */
export function HeroTypographicAccent() {
  return (
    <div
      aria-hidden
      className="relative w-full max-w-[560px] mx-auto py-6 text-center select-none"
    >
      {/* Faint vertical hairline running behind the type — quiet
          structure without a card frame. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-2 bottom-2 -translate-x-1/2 w-px bg-gold/15"
      />

      {/* Greek doxology, large. Cardo handles polytonic accents
          (Δόξα τῷ Θεῷ — "Glory to God"). The breathing animation is
          inherited from the parent .lampada-glow class. */}
      <p
        className="relative font-[var(--font-greek)] text-[64px] md:text-[88px] lg:text-[112px] leading-[1] tracking-[-0.01em] text-gold/85"
        style={{
          animation: "halo-breathe 6.5s ease-in-out infinite",
        }}
      >
        Δόξα τῷ Θεῷ
      </p>

      {/* English rendering, smaller, paper tone. */}
      <p
        className="relative mt-6 font-display-serif text-[18px] md:text-[22px] lg:text-[26px] italic text-paper/65 tracking-[0.04em]"
      >
        Glory to God
      </p>

      {/* Closing dot ornament. */}
      <p
        aria-hidden
        className="relative mt-5 font-sans text-[12px] uppercase tracking-[3px] text-paper/35"
      >
        for all things
      </p>
    </div>
  );
}
