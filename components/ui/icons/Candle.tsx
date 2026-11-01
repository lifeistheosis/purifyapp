import type { SVGProps } from "react";

/**
 * The lit candle: the door to Amen, Praying and Glory to God under a post and
 * a reply in Community (1.8, the owner's pick of mark 1 on r3-30b, note 80 of
 * build 86), in place of the praying figure he asked to be rid of ("maybe
 * change the widget photo instead of a guy with his hands up").
 *
 * Drawn from Lampada.tsx, his candle of 2026-10-28 for every lit thing in
 * Purify: the same beeswax taper on its line of ground, the same flame,
 * filled so it reads as lit at a reply's 13px. On the app's 24 grid with its
 * 1.6 stroke and round ends. Inherits `currentColor`: the row draws it grey,
 * and lights it white once the reader has answered (community-lit).
 *
 * Its own file, apart from Lampada, because it is a door and not a state: the
 * row's mark can be redrawn without every lit thing in the app changing with
 * it, and the walk and the tests can tell the two apart.
 */
export function Candle({
  size = 16,
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
      focusable="false"
      {...props}
    >
      {/* the flame, filled: lit */}
      <path d="M12 2.8 C13.5 4.6, 13.7 6.4, 12 8.2 C10.3 6.4, 10.5 4.6, 12 2.8 Z" fill="currentColor" />
      {/* the wick */}
      <path d="M12 8.2 V9.6" />
      {/* the taper */}
      <path d="M10.1 21 V10.4 C10.1 10 10.4 9.7 10.8 9.7 H13.2 C13.6 9.7 13.9 10 13.9 10.4 V21" />
      {/* the ground it stands on */}
      <path d="M8 21 H16" />
    </svg>
  );
}
