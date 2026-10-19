import type { SVGProps } from "react";

/**
 * An event's mark on the History timeline's one line (1.7). It replaces the
 * filled red dot, which the owner read as "vibe coded" (note 20 of
 * 2026-10-16): a drawn ring in the page's own ink, never a colour.
 *
 *  - "event": a hollow ring.
 *  - "major": the ring with a point at its centre, for the events that
 *    define their age (importance 1).
 *
 * The row the reader is at (the scroll spy's, or the one chosen beside the
 * rail on a computer) fills its ring: the row carries `data-current` and
 * globals.css ("The History line") fills `[data-node-ring]`, so the spy
 * changes one attribute and never redraws the list.
 *
 * The disc under the ring is the page's own night, so the line never runs
 * through the mark. Inherits `currentColor`.
 */
export function TimelineNode({
  kind = "event",
  size = 13,
  ...props
}: SVGProps<SVGSVGElement> & { kind?: "event" | "major"; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
      data-timeline-node={kind}
      {...props}
    >
      <circle cx="6.5" cy="6.5" r="6.5" fill="var(--color-night)" />
      <circle data-node-ring cx="6.5" cy="6.5" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      {kind === "major" ? <circle cx="6.5" cy="6.5" r="1.6" fill="currentColor" /> : null}
    </svg>
  );
}
