/**
 * A wider, more ornamental ruled divider than `OrnamentRule`. Used as a
 * "headpiece" above section headings — three central three-bar Greek
 * crosses flanked by horizontal hairlines with floral curls at the
 * outer ends.
 *
 * Reads `--tone` from the surrounding wrapper when `tinted`; otherwise
 * stays gold.
 */
export function OrnamentHeadpiece({
  className = "",
  tinted = false,
}: {
  className?: string;
  tinted?: boolean;
}) {
  const stroke = tinted ? "rgb(var(--tone, 212 175 55))" : "rgb(212 175 55)";
  return (
    <svg
      role="presentation"
      viewBox="0 0 480 36"
      width="100%"
      height="36"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="oh-fade-l" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={stroke} stopOpacity="0" />
          <stop offset="1" stopColor={stroke} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="oh-fade-r" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={stroke} stopOpacity="0.85" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer floral curls */}
      <path
        d="M 8 18 C 16 8, 28 8, 36 18"
        fill="none"
        stroke={stroke}
        strokeWidth="1"
        opacity="0.55"
      />
      <path
        d="M 472 18 C 464 8, 452 8, 444 18"
        fill="none"
        stroke={stroke}
        strokeWidth="1"
        opacity="0.55"
      />

      {/* Left fading rule */}
      <line x1="40" y1="18" x2="190" y2="18" stroke="url(#oh-fade-l)" strokeWidth="1" />

      {/* Three central crosses (Russian-style, three bars) */}
      {[210, 240, 270].map((cx) => (
        <g key={cx} stroke={stroke} strokeWidth="1.4" fill="none" opacity="0.95">
          <line x1={cx} y1="6" x2={cx} y2="30" />
          <line x1={cx - 6} y1="11" x2={cx + 6} y2="11" />
          <line x1={cx - 8} y1="18" x2={cx + 8} y2="18" />
          <line x1={cx - 5} y1="25" x2={cx + 5} y2="22" />
        </g>
      ))}

      {/* Right fading rule */}
      <line x1="290" y1="18" x2="440" y2="18" stroke="url(#oh-fade-r)" strokeWidth="1" />

      {/* Side diamonds */}
      <g fill={stroke} opacity="0.75">
        <path d="M 192 18 L 196 14 L 200 18 L 196 22 Z" />
        <path d="M 280 18 L 284 14 L 288 18 L 284 22 Z" />
      </g>
    </svg>
  );
}
