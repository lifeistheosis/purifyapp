import { PurifyMark } from "@/components/ui/PurifyMark";

/**
 * Right-side hero piece. The Purify mark (an Orthodox three-bar cross)
 * rendered large and bled off the right edge of the viewport.
 *
 * Now a crisp inline SVG (`PurifyMark`) in the near-white accent,
 * replacing the old raster `/purify-cross.png` — it scales without the
 * optimizer re-encoding artefacts the PNG suffered and composites
 * cleanly on any surface.
 *
 * Entrance is a pure-CSS fade-and-rise (`.hero-cross-in` in
 * globals.css) so it needs no client JS and fires even when the page
 * first loads in a background tab. Reduced-motion users get it static.
 *
 * The component name is historical (an earlier design used the
 * Pantocrator icon).
 */

const SIZE = 720; // px tall; bled partly off-canvas at xl

export function HeroChristIcon() {
  return (
    <div
      aria-hidden
      className="hero-cross-in relative flex items-center justify-center select-none pointer-events-none text-gold-pale/90"
      style={{ width: SIZE, height: SIZE }}
    >
      <PurifyMark
        size={SIZE}
        className="drop-shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
