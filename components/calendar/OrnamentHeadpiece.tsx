/**
 * A quiet headpiece divider in the idiom of a printed service-book, a
 * single centered three-bar Greek cross with thin side rules that fade
 * toward the page margins. Replaces the louder three-cross-mandala
 * variant.
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
 const stroke = tinted ? "rgb(var(--tone, 183 176 163))" : "rgb(183 176 163)";
 return (
 <svg
 role="presentation"
 viewBox="0 0 480 28"
 width="100%"
 height="28"
 className={className}
 preserveAspectRatio="xMidYMid meet"
 >
 <defs>
 <linearGradient id="oh-fade-l" x1="0" x2="1" y1="0" y2="0">
 <stop offset="0" stopColor={stroke} stopOpacity="0" />
 <stop offset="1" stopColor={stroke} stopOpacity="0.7" />
 </linearGradient>
 <linearGradient id="oh-fade-r" x1="0" x2="1" y1="0" y2="0">
 <stop offset="0" stopColor={stroke} stopOpacity="0.7" />
 <stop offset="1" stopColor={stroke} stopOpacity="0" />
 </linearGradient>
 </defs>

 {/* Left rule, fading inward */}
 <line x1="40" y1="14" x2="220" y2="14" stroke="url(#oh-fade-l)" strokeWidth="1" />

 {/* Single centered three-bar cross */}
 <g stroke={stroke} strokeWidth="1.4" fill="none">
 <line x1="240" y1="2" x2="240" y2="26" />
 <line x1="233" y1="8" x2="247" y2="8" />
 <line x1="230" y1="14" x2="250" y2="14" />
 <line x1="234" y1="22" x2="246" y2="18" />
 </g>

 {/* Right rule, fading outward */}
 <line x1="260" y1="14" x2="440" y2="14" stroke="url(#oh-fade-r)" strokeWidth="1" />
 </svg>
 );
}
