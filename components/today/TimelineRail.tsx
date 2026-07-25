import type { ReactNode } from "react";

/**
 * Pure-CSS vertical rail that runs down the left margin of a stacked
 * sequence of cards, with a small dot at each card's vertical mid-line.
 * Visually unifies the stacked Today cards into a sequenced "today's path."
 *
 * Children are rendered in order; each receives a leading dot. The first
 * dot is filled with the rubric accent, subsequent dots are outlined.
 *
 * No JS, no client component. The dot fill is controlled by the order
 * index (0 → filled, others → ring).
 */
export function TimelineRail({ children }: { children: ReactNode[] }) {
  return (
    <div className="relative">
      {/* The continuous 2px rail */}
      <div
        aria-hidden
        className="absolute left-[10px] top-3 bottom-3 w-px bg-paper/12"
      />
      <ul className="cascade space-y-3.5">
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
