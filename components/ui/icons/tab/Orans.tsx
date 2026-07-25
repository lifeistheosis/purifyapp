import type { SVGProps } from "react";

/**
 * Orans — the "Prayers" tab glyph.
 *
 * The catacomb prayer posture, arms lifted and open: the oldest Christian
 * image of prayer, and the stance of the Theotokos in the Platytera apse.
 * Deliberately headless and figureless, because a tab icon is a sign and a
 * figure at 22px becomes a stick man.
 *
 * No knots: a rope loop would collide with the halo ring in the "You" glyph,
 * which already owns concentric circles. No cross: the Evangelion already
 * carries the cross, and two crosses in one row was one of the original set's
 * worst duplications.
 *
 * Replaces `icons/PrayerRope` IN THE TAB BAR ONLY, where it was the worst
 * offender in the set: 14 drawn elements, eight filled knots of r 1.0 (1.8 CSS
 * px each), strokeOpacity used at 0.4 and 0.6 as a hierarchy crutch, and ink
 * from y 1.6 to 22.0 so it clipped the viewBox at BOTH ends. PrayerRope itself
 * is untouched and still serves PrayersMobile.
 *
 * Ink bbox 4.4,3.9 -> 19.6,20.2 (15.2 x 16.3), centre (12.0, 12.05). Lightest
 * mark in the bar at 39u of ink, which is intentional: the row needed one
 * open, upward, generous form to break up six closed objects.
 */
export function Orans({
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
      {/* Left arm: shoulder run, elbow at r 3.5, forearm rising.
          The sweep flag is load-bearing — 1 here and 0 on the right arm puts
          both elbows on the OUTSIDE. Swap them and the arms notch inward. */}
      <path d="M12 14.4 H7.9 A3.5 3.5 0 0 1 4.4 10.9 V3.9" />
      {/* Right arm, mirrored */}
      <path d="M12 14.4 H16.1 A3.5 3.5 0 0 0 19.6 10.9 V3.9" />
      {/* Body, 5.8u */}
      <path d="M12 14.4 V20.2" />
    </svg>
  );
}
