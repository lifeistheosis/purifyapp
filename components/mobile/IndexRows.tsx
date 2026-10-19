import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The Bible tab's one row language.
 *
 * The tab is an index: a list of books, and above it the few things a reader
 * comes back for. Until 1.6 each of those few things had a look of its own (a
 * bordered card, two tinted pills, a glassy band with a button, a lone half
 * width tile), five kinds of thing before the first book, and the first book
 * a whole screen down. The owner, of that screen, on 2026-10-13: "this design
 * has way too much stuff going on here".
 *
 * So everything on the tab under its picture is drawn with these three, the
 * rows the book list always had: a small grey heading, a rounded list, a row
 * with its words at the start and a grey note at the end. One look, and the
 * books are the same thing as what sits above them.
 */
/** The rounded list every group of rows sits in. Shared, so a row that is
    not a list of links (the study row's two halves) is still this look. */
export const INDEX_LIST_LOOK =
  "overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]";

export function IndexEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 px-1 font-sans text-caption text-paper/45">
      {children}
    </p>
  );
}

export function IndexList({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & Record<`data-${string}`, string>) {
  return (
    <ul {...rest} className={cn(INDEX_LIST_LOOK, className)}>
      {children}
    </ul>
  );
}

export function IndexRow({
  href,
  left,
  right,
  first,
}: {
  href: string;
  /** The row's own words: a book, a chapter, a reading. */
  left: ReactNode;
  /** The grey note at the end: how many chapters, which reading, where to. */
  right?: ReactNode;
  /** The first row of a list has no line over it. */
  first?: boolean;
}) {
  return (
    <li className={first ? undefined : "border-t border-paper/[0.06]"}>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors active:bg-paper/[0.04]"
      >
        {/* min-w-0 so a long reference wraps inside the row and does not
            push the note off its end. */}
        <span className="min-w-0 font-heading text-ui font-semibold leading-tight text-paper">
          {left}
        </span>
        {right != null && right !== "" ? (
          <span className="shrink-0 font-sans text-caption tabular-nums text-paper/45">
            {right}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
