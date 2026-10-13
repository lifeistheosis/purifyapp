import type { SVGProps } from "react";

/**
 * Praying hands, the "Prayers" tab glyph.
 *
 * The owner asked for it by name (2026-10-13): hands praying on Prayers, and
 * the three-bar cross, which Prayers wore until then, on Discover. He sent a
 * reference for the hands, the common sign, and when three drawings of my
 * own did not read he sent it again: "legit just do this". So this follows
 * that sign part for part, drawn fresh in this bar's own line:
 *
 * - three short rays over the fingertips,
 * - two hands, each with its own rounded fingertip, meeting down the middle,
 * - a thumb in each, an arch that leans on the seam,
 * - the heel of each hand curving out to its cuff,
 * - a cuff on each wrist, a rounded band turned outward.
 *
 * THIN LINES, and that is deliberate. This glyph has three times the lines of
 * its neighbours in the same 22px. At the bar's usual 1.6 they closed up into
 * one white lump, and the owner's word for it was "so thick you can't really
 * tell what it is". At 0.95 each part can be told from the next, and the
 * glyph weighs about what the cross beside it does. Do not "fix" it back to
 * 1.6, and do not add a line without drawing the result at 22px first.
 *
 * Tried and not kept, each drawn at size and shown to him: one pointed shape
 * with a seam (an arrowhead), the hands upright on one cuff (a bullet on a
 * stand), in profile (a pencil), filled in (a blot at this size).
 *
 * Path coordinates run from 2.0 to 21.6 vertically, the full height, because
 * the rays need the room. Across they stay inside 4.0 to 20.0.
 */
export function PrayingHands({
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
      strokeWidth={0.95}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* The rays over the fingertips */}
      <path d="M12 2 V4" />
      <path d="M9 3.7 L10 4.9" />
      <path d="M15 3.7 L14 4.9" />
      {/* Left hand: its rounded fingertip, then its outer edge down to the cuff */}
      <path d="M12 7.3 C12 6.6 11.55 6.2 10.98 6.2 C10.4 6.2 9.98 6.6 9.9 7.2 C9 9.6 7.6 12.8 7.1 16.7" />
      {/* Right hand, mirrored */}
      <path d="M12 7.3 C12 6.6 12.45 6.2 13.02 6.2 C13.6 6.2 14.02 6.6 14.1 7.2 C15 9.6 16.4 12.8 16.9 16.7" />
      {/* The seam where the two palms meet */}
      <path d="M12 7.3 V16.4" />
      {/* A thumb in each hand, an arch leaning on the seam */}
      <path d="M12 12.3 C11.9 11.8 11.4 11.5 10.9 11.5 C10.2 11.5 9.8 12.1 9.7 12.9 L9.5 15" />
      <path d="M12 12.3 C12.1 11.8 12.6 11.5 13.1 11.5 C13.8 11.5 14.2 12.1 14.3 12.9 L14.5 15" />
      {/* The heel of each hand, curving out to its cuff */}
      <path d="M12 16.4 C11.6 17.6 10.8 18.6 9.9 19.3" />
      <path d="M12 16.4 C12.4 17.6 13.2 18.6 14.1 19.3" />
      {/* The cuffs */}
      <rect x="-2.65" y="-1.4" width="5.3" height="2.8" rx="0.75" transform="translate(6.9 18.7) rotate(43.5)" />
      <rect x="-2.65" y="-1.4" width="5.3" height="2.8" rx="0.75" transform="translate(17.1 18.7) rotate(-43.5)" />
    </svg>
  );
}
