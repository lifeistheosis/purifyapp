/**
 * The Purify brand badge: the EXACT PurifyMark cross (the logo — rounded
 * three-bar Orthodox cross, see ui/PurifyMark.tsx) inside the black circle
 * with a hairline ring. The geometry below is the mark's own rects, scaled
 * and centered into the disc, so the paywall hero and every other badge use
 * the same minimalist cross as the wordmark — not a separate redraw.
 *
 * Use this where the brand should be recognized at display size (the Plus
 * paywall hero); `PurifyMark` remains the bare cross for headers and inline.
 */
export function PurifyBadge({
  size = 72,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className={className}
    >
      <circle cx="32" cy="32" r="31.25" fill="#0a0a0a" />
      <circle
        cx="32"
        cy="32"
        r="31.25"
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1.5"
      />
      {/* PurifyMark geometry (viewBox 48x64), scaled to 62% disc height and
          centered: translate((64-48*s)/2, (64-64*s)/2) with s = 0.62. Keep
          these rects in lockstep with ui/PurifyMark.tsx. */}
      <g transform="translate(17.12, 12.16) scale(0.62)" fill="#fff">
        {/* upright post */}
        <rect x="21" y="3" width="6" height="58" rx="2.5" />
        {/* titulus (top bar) */}
        <rect x="16.5" y="11" width="15" height="4.5" rx="2.25" />
        {/* main crossbar */}
        <rect x="10" y="21" width="28" height="5.5" rx="2.75" />
        {/* slanted footrest (suppedaneum) */}
        <rect
          x="14"
          y="41.5"
          width="20"
          height="4.5"
          rx="2.25"
          transform="rotate(-16 24 43.75)"
        />
      </g>
    </svg>
  );
}
