import { Cross } from "@/components/ui/icons/Cross";

/**
 * Right-side hero piece: a clean, slender three-bar Orthodox cross, set
 * as a quiet accent and bled partly off the right edge of the viewport
 * behind the copy.
 *
 * Uses the stroked `ui/icons/Cross` (thin lines) rather than the filled
 * brand mark, with a hairline stroke refined for display size, so it reads
 * as an elegant Orthodox cross and not a heavy block. Entrance is the
 * pure-CSS `.hero-cross-in` fade-and-rise in globals.css.
 *
 * The component name is historical (an earlier design used the
 * Pantocrator icon).
 */

const SIZE = 380; // px tall; a slender accent, bled partly off-canvas at xl

export function HeroChristIcon() {
  return (
    <div
      aria-hidden
      className="hero-cross-in relative flex items-center justify-center select-none pointer-events-none text-gold-pale/80"
      style={{ width: SIZE, height: SIZE }}
    >
      {/* Thin stroke at display size: 0.45 viewBox units → a clean hairline
          cross rather than the heavy filled mark. */}
      <Cross
        size={SIZE}
        strokeWidth={0.45}
        className="drop-shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
      />
    </div>
  );
}
