import type { SVGProps } from "react";

/**
 * A speech bubble: the Chat tile on Discover.
 *
 * Chat was a tab, and its tab wore the church. On Discover the church is
 * already the Councils tile two rows up, so the same glyph twice in one grid
 * would read as a mistake. A speech bubble is the sign every reader already
 * has for the word on the tile. Drawn on the shared 24-grid with the family's
 * 1.6 stroke and round joins. Inherits `currentColor`.
 */
export function ChatBubble({
  size = 20,
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
      {/* The bubble, with its tail at the lower left */}
      <path d="M6 4.5h12a2.5 2.5 0 0 1 2.5 2.5v6.5a2.5 2.5 0 0 1-2.5 2.5h-6.2L7.5 19.8V16H6a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 6 4.5z" />
    </svg>
  );
}
