/**
 * The Purify app-icon badge: the white three-bar Orthodox cross inside the
 * black circle, exactly as the launcher icon draws it (app/icon.tsx geometry,
 * translated from its composed divs into one SVG). A hairline ring keeps the
 * black disc legible on the app's dark surfaces.
 *
 * Use this where the APP ICON should be recognized (the Plus paywall hero);
 * `PurifyMark` remains the bare cross for headers and inline marks.
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
      {/* Cross container: 60% x 76% of the disc, centered (12.8..51.2 / 7.7..56.3) */}
      {/* Vertical post: 16% wide, 84% tall, top 8% */}
      <rect x="28.93" y="11.57" width="6.14" height="40.86" fill="#fff" />
      {/* Titulus, short top bar: 44% wide, 9% tall, top 16% */}
      <rect x="23.55" y="15.46" width="16.90" height="4.38" fill="#fff" />
      {/* Main bar: 72% wide, 11% tall, top 33% */}
      <rect x="18.18" y="23.73" width="27.65" height="5.35" fill="#fff" />
      {/* Slanted footrest: 54% wide, 9% tall, top 66%, rotated -18deg */}
      <rect
        x="21.63"
        y="39.78"
        width="20.74"
        height="4.38"
        fill="#fff"
        transform="rotate(-18 32 41.97)"
      />
    </svg>
  );
}
