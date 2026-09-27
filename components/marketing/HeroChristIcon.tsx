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

/** The art's own size; drawn at 440px from md, 520px from lg and this from xl. */
const SIZE = 640;

export function HeroChristIcon() {
  return (
    <div
      aria-hidden
      className="hero-cross-in relative flex h-[440px] w-[440px] items-center justify-center select-none pointer-events-none lg:h-[520px] lg:w-[520px] xl:h-[640px] xl:w-[640px]"
    >
      <Image
        src="/purify-cross.png"
        alt=""
        width={SIZE}
        height={SIZE}
        priority
        className="lm-invert h-full w-full object-contain drop-shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
