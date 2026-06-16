import Image from "next/image";

/**
 * Right-side hero piece: the Purify cross mark, an Orthodox three-bar
 * cross. This is the original raster art (`/purify-cross.png`), rendered
 * large and bled partly off the right edge of the viewport behind the
 * copy.
 *
 * Entrance is a pure-CSS fade-and-rise (`.hero-cross-in` in globals.css)
 * so it needs no client JS and fires even when the page first loads in a
 * background tab. Reduced-motion users get it static.
 *
 * The component name is historical (an earlier design used the
 * Pantocrator icon).
 */

const SIZE = 640; // px tall; bled partly off-canvas at xl

export function HeroChristIcon() {
  return (
    <div
      aria-hidden
      className="hero-cross-in relative flex items-center justify-center select-none pointer-events-none"
      style={{ width: SIZE, height: SIZE }}
    >
      <Image
        src="/purify-cross.png"
        alt=""
        width={SIZE}
        height={SIZE}
        priority
        className="h-full w-full object-contain drop-shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
