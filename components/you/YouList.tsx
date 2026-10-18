import Link from "next/link";
import type { ReactNode } from "react";

import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { cn } from "@/lib/cn";

/**
 * The You tab's lists, in the row language the Bible tab has used since 1.6
 * (components/mobile/IndexRows.tsx): a small grey name over a rounded list,
 * each row its words at the start and a grey note at the end. One look for
 * where a reader left off and what they have kept, so the tab reads as the
 * same thing all the way down rather than a card of its own for each part.
 *
 * A row here may carry a second line under its words (the newest thing in a
 * group, the saint whose work it is), which the Bible's rows never need.
 */

/** A part of the tab: its name, for the eye and as a heading for a screen reader. */
export function YouSection({
  title,
  children,
  className,
  ...rest
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
} & Record<`data-${string}`, string>) {
  return (
    <section {...rest} className={className}>
      {/* A heading by role: every h1 to h6 is set in Lora (globals.css). */}
      <p role="heading" aria-level={2} className="mb-2 px-1 font-sans text-caption text-paper/50">
        {title}
      </p>
      {children}
    </section>
  );
}

export function YouList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn(INDEX_LIST_LOOK, className)}>{children}</ul>;
}

export function YouRow({
  href,
  onClick,
  title,
  detail,
  note,
  first,
  ...rest
}: {
  href: string;
  /** Called before the link is followed; `preventDefault` keeps it (a locked journal opens the upgrade sheet). */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /** The row's own words. */
  title: ReactNode;
  /** A second, smaller line: the newest thing in a group, whose work it is. */
  detail?: ReactNode;
  /** The grey note at the end: a count, where it picks up. */
  note?: ReactNode;
  /** The first row of a list has no line over it. */
  first?: boolean;
} & Record<`data-${string}`, string>) {
  return (
    <li className={first ? undefined : "border-t border-paper/[0.06]"}>
      <Link
        {...rest}
        href={href}
        onClick={onClick}
        className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 motion-safe:transition-colors active:bg-paper/[0.04]"
      >
        <span className="min-w-0">
          <span className="block font-heading text-ui font-semibold leading-tight text-paper">{title}</span>
          {detail ? <span className="mt-1 block truncate font-sans text-caption leading-snug text-paper/55">{detail}</span> : null}
        </span>
        {note != null && note !== "" ? (
          <span className="flex shrink-0 items-center gap-2 font-sans text-caption tabular-nums text-paper/45">{note}</span>
        ) : null}
      </Link>
    </li>
  );
}
