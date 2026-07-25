import type { SVGProps } from "react";

/**
 * Settings gear — the "You" tab glyph, drawn from the owner's icon pack.
 *
 * REDUCED TO FOUR TEETH ON PURPOSE, and the reason is measured rather than
 * stylistic. The pack's gear has eight teeth around a toothed ring. Rasterised
 * at the real 22px, each tooth is roughly 1.5 CSS px and they weld into a
 * noisy blob:
 *
 *     8 teeth        +##++#+##+#++##+      blurred vs Today = 0.782
 *     6 teeth        .+##+.####.+##+.      blurred vs Today = 0.796
 *     4 teeth        +##.      .##+       blurred vs Today = 0.695
 *
 * A gear needs about 32px to read as a gear. At 22px the eight-tooth version
 * also became the WORST silhouette pair in the bar, because a toothed ring and
 * Today's rayed sun blur to the same thing. Four teeth is the most that stays
 * legible here.
 *
 * Known trade-off, flagged rather than hidden: at 0.695 against Today this is
 * still the highest-correlation pair this glyph could introduce, and with only
 * four teeth it reads closer to a compass than a gear. A two-slider "settings"
 * mark measured cleaner (0.637, and visually crisp at this size) if the gear
 * ever looks wrong on device.
 *
 * Semantics worth knowing: a gear says Settings, while this tab is labelled
 * "You" and routes to /account. That was the owner's explicit call.
 *
 * Replaces `HaloedHead` in the tab bar only. HaloedHead is still the Saints
 * glyph in Reading and on the reading page, and is untouched. That is just as
 * well: its halo (r 4.7) and head (r 2.7) sit 2.000u apart, which is 0.00u of
 * clear space at strokeWidth 2.0, so it is currently held apart only by
 * strokeOpacity 0.55. Stripping that opacity without widening the halo would
 * render a solid donut.
 *
 * Ink bbox 3.6,3.6 -> 20.4,20.4 (16.8 x 16.8), centre (12.0, 12.0), 5 elements.
 */
export function Gear({
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
      {/* Hub */}
      <circle cx="12" cy="12" r="5.2" />
      {/* Four teeth, on the axes so they stay pixel-aligned at 22px */}
      <path d="M12 3.6 V6.8" />
      <path d="M12 17.2 V20.4" />
      <path d="M3.6 12 H6.8" />
      <path d="M17.2 12 H20.4" />
    </svg>
  );
}
