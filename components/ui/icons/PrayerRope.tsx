import type { SVGProps } from "react";

/**
 * Prayer rope (komboskini) — the knotted wool cord used in Orthodox
 * practice to count the Jesus Prayer. Drawn as a faint cord loop carrying
 * a ring of small filled knots, with a short tail descending to a hanging
 * three-bar Orthodox cross. Replaces the orans figure for the Prayers tab:
 * it reads as a specifically Orthodox devotional object (not a stick
 * figure) and stays distinct from the haloed "You" circle and the
 * "Discover" star. Shares the 1.6 stroke of the tab-bar set.
 */
export function PrayerRope({
  size = 22,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  // Eight knots evenly spaced around the cord loop (cx 12, cy 7.6, r 5).
  const cx = 12;
  const cy = 7.6;
  const r = 5;
  const knots = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

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
      {/* cord loop carrying the knots */}
      <circle cx={cx} cy={cy} r={r} strokeOpacity="0.4" />
      {/* knots */}
      {knots.map((k, i) => (
        <circle key={i} cx={k.x} cy={k.y} r="1" fill="currentColor" stroke="none" />
      ))}
      {/* short tail from the bottom knot down to the cross */}
      <line x1="12" y1="13" x2="12" y2="15" strokeOpacity="0.6" />
      {/* hanging three-bar Orthodox cross */}
      <line x1="12" y1="15" x2="12" y2="22" />
      <line x1="10" y1="16.4" x2="14" y2="16.4" />
      <line x1="9" y1="18.2" x2="15" y2="18.2" />
      <line x1="10.4" y1="20.6" x2="13.6" y2="19.7" />
    </svg>
  );
}
