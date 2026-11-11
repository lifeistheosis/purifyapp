import type { SVGProps } from "react";

/**
 * A highlighter on the diagonal: a broad body with its cap line, a chisel
 * tip, and the mark it leaves beneath. The highlight's own glyph (1.9): the
 * verse's and a Father's paragraph's highlight toggle, the journal page's
 * Highlight tool and a highlighted verse on Today. It took the place of the
 * four-point sparkle, which the owner named AI slop (CLAUDE.md, "No sparkle
 * star"). Broader than the note's Pen, so the two never read as one.
 * `filled` renders the highlighted state. Inherits `currentColor`.
 */
export function Highlighter({
  size = 18,
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; filled?: boolean }) {
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
      {/* the body and its chisel tip */}
      <path d="M15.9 3.9l4.2 4.2-8.5 8.5-2.9.6-2-2 .7-2.8z" fill={filled ? "currentColor" : "none"} />
      {/* the cap line */}
      <line x1="14.3" y1="5.5" x2="18.5" y2="9.7" />
      {/* the mark it leaves */}
      <line x1="4" y1="20.5" x2="11" y2="20.5" />
    </svg>
  );
}
