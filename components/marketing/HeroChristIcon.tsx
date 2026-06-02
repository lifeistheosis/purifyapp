import Image from "next/image";

/**
 * Right-side hero piece. The Purify mark (an Orthodox three-bar cross)
 * rendered large and bled off the right edge of the viewport.
 *
 * The asset is `/purify-cross.png`, a transparent PNG generated from
 * the source logo (the black field was made fully transparent, the
 * cross tinted warm white with soft anti-aliased edges). Because the
 * transparency is baked into the file, it composites cleanly on any
 * background — no CSS mask, no `mix-blend-mode`, no seams or boxes.
 *
 * Entrance is a pure-CSS fade-and-rise (`.hero-cross-in` in
 * globals.css) so it needs no client JS and fires even when the page
 * first loads in a background tab. Reduced-motion users get it static.
 *
 * The component name is historical (an earlier design used the
 * Pantocrator icon).
 */

const SIZE = 720; // px square; bled partly off-canvas at xl

export function HeroChristIcon() {
  return (
    <div
      aria-hidden
      className="hero-cross-in relative select-none pointer-events-none"
      style={{ width: SIZE, height: SIZE }}
    >
      <Image
        src="/purify-cross.png"
        alt=""
        width={SIZE}
        height={SIZE}
        priority
        // Serve the exact PNG. Next's lossy optimizer (q=75) re-encodes
        // the transparent edges and lifts their alpha back up, which
        // reintroduces a faint white frame around the mark.
        unoptimized
        className="w-full h-full object-contain"
      />
    </div>
  );
}
