import type { ReactNode } from "react";

/**
 * Reusable timeline rail (extracted from components/today/TimelineRail.tsx).
 * Renders an ordered list of cards along a vertical guide with a small
 * indicator dot at each card. The first dot is filled in the rubric-red
 * accent so the page reads as "today is here, scroll down for the rest."
 *
 * Pure server component. No JS, no client state.
 */
export function MobileTimeline({ children }: { children: ReactNode[] }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute left-[10px] top-3 bottom-3 w-px bg-paper/12"
      />
      <ul className="space-y-5">
        {children.map((node, i) => (
          <li key={i} className="relative pl-7">
            <span
              aria-hidden
              className={
                "absolute left-[5px] top-7 h-[11px] w-[11px] rounded-full " +
                (i === 0
                  ? "bg-crimson"
                  : "border border-paper/30 bg-night")
              }
            />
            {node}
          </li>
        ))}
      </ul>
    </div>
  );
}
