import type { SVGProps } from "react";

import { LAMPADA_PATHS } from "./Lampada";

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
      <path d={LAMPADA_PATHS.flame} fill="currentColor" />
      {/* the wick */}
      <path d={LAMPADA_PATHS.wick} />
      {/* the taper */}
      <path d={LAMPADA_PATHS.taper} />
      {/* the ground it stands on */}
      <path d={LAMPADA_PATHS.ground} />
    </svg>
  );
}
