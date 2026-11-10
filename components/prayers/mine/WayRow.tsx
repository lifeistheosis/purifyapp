"use client";

import type { ReactNode } from "react";

import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";

/**
 * One row of Your rule's lit panels (.set-panel): a tall picture or plate at
 * the start, the title and its line beside it, the arrow at the end.
 *
 * "Start from the morning prayers", "Add prayers one by one" and "In which
 * prayers" are all this one row (build 89 note 14). "In which prayers" used
 * to be a second drawing of it, and `.set-row`, which sets `display: block`
 * outside Tailwind's layers and so outranks `flex`, stacked its icon over its
 * words and its arrow under them. One row cannot drift from itself.
 */
export function WayRow({
  lead,
  label,
  desc,
  onClick,
  opensSheet = false,
  expanded,
  oneLine = false,
  data,
}: {
  /** WayPicture or WayPlate. */
  lead: ReactNode;
  label: ReactNode;
  desc: ReactNode;
  onClick: () => void;
  /** The row opens a sheet, and says so to a screen reader. */
  opensSheet?: boolean;
  /** The row opens something in place under it (the nameday's choice): whether it is open. */
  expanded?: boolean;
  /** Keep the line to one line, cut with an ellipsis (a list of names that can run long). */
  oneLine?: boolean;
  /** A marker for the export walk and the tests, as `{ "data-remembered-in": "" }`. */
  data?: Record<`data-${string}`, string>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup={opensSheet ? "dialog" : undefined}
      aria-expanded={expanded}
      className="set-link rule-way flex w-full items-center gap-3 text-start"
      {...data}
    >
      {lead}
      <span className="min-w-0 flex-1">
        <span className="set-label">{label}</span>
        <span className={oneLine ? "set-desc truncate" : "set-desc"}>{desc}</span>
      </span>
      {expanded === undefined ? (
        <ChevronRight size={15} className="set-chev rtl:-scale-x-100" />
      ) : (
        // It opens in place under the row, so its arrow points down, and turns
        // up while open (his yes to 104, the Nameday row).
        <ChevronDown
          size={15}
          className={`set-chev motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-house${expanded ? " rotate-180" : ""}`}
        />
      )}
    </button>
  );
}

/** A way's picture: the app's own file, cut to the row's tall plate. */
export function WayPicture({ src, focus }: { src: string; focus?: string }) {
  return (
    <span aria-hidden className="rule-way-pic">
      {/* eslint-disable-next-line @next/next/no-img-element -- the app's own file, as the head's */}
      <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" style={{ objectPosition: focus }} />
    </span>
  );
}

/** A way's glyph on the lit plate, the picture's size. */
export function WayPlate({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="set-plate rule-way-plate">
      {children}
    </span>
  );
}
