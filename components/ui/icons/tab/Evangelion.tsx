import type { SVGProps } from "react";

/**
 * Evangelion — the "Bible" tab glyph.
 *
 * The Gospel book that rests on the altar and is carried in the Little
 * Entrance, shown closed and face-on as it appears on the holy table. The
 * cover cross is two-bar with the slanted suppedaneum, the footrest that
 * distinguishes the Eastern cross from the Latin one; the titulus is dropped
 * because a third bar cannot survive at 22px. The spine turns at r 0.8 and the
 * fore-edge at r 3.5, so the block of pages reads as the soft side.
 *
 * Replaces `icons/Codex` IN THE TAB BAR ONLY. Codex is still the glyph on the
 * Bible index, Discover and Reading, where it is read at a larger size and its
 * three-bar cross and ribbons hold up.
 *
 * Ink bbox 4.4,3.3 -> 19.6,20.8 (15.2 x 17.5), centre (12.0, 12.05).
 * The narrowest parallel pair is the main bar to the footbar at 4.6u, which
 * leaves 2.6u of clear space at strokeWidth 2.0.
 */
export function Evangelion({
  size = 22,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Cover. Square spine on the left (r 0.8), soft fore-edge on the
          right (r 3.5) — that asymmetry is the only thing separating this
          silhouette from a rounded square, so it is not decoration. */}
      <path d="M5.2 3.3 H16.1 A3.5 3.5 0 0 1 19.6 6.8 V17.3 A3.5 3.5 0 0 1 16.1 20.8 H5.2 A0.8 0.8 0 0 1 4.4 20 V4.1 A0.8 0.8 0 0 1 5.2 3.3 Z" />
      {/* Upright */}
      <path d="M12 7.8 V16.3" />
      {/* Crossbar */}
      <path d="M8.9 10 H15.1" />
      {/* Slanted footrest: 1.4u of drop over 4.4u, 17.65 degrees. This is the
          whole Orthodox claim of the mark; if it ever reads as horizontal the
          glyph degrades to a Latin cross with a stray dash. */}
      <path d="M9.8 16 L14.2 14.6" />
    </svg>
  );
}
