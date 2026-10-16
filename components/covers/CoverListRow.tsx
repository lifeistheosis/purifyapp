import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A book as one row of a list (1.7): its cover at the left, then the title in
 * Lora, one quiet line of facts and two lines of what it is. The rows of a
 * list are parted by hairlines (`ul.divide-y divide-paper/8`), with no card
 * around them and no arrow at their end: the whole row is the way in.
 *
 * With `href` the row is one link. A row that holds links of its own (a book
 * in print: Buy on Amazon) takes `footer` instead and is not a link, so no
 * link sits inside another.
 */
export function CoverListRow({
  href,
  cover,
  title,
  meta,
  blurb,
  footer,
  className,
}: {
  /** The row's way in. Without it the row is still, and `footer` holds its links. */
  href?: string;
  cover: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  blurb?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const body = (
    <>
      {cover}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-serif text-lede font-semibold leading-tight text-paper">{title}</span>
        {meta ? <span className="mt-1 font-sans text-caption text-paper/55">{meta}</span> : null}
        {blurb ? (
          <span className="mt-1.5 line-clamp-2 font-sans text-detail leading-relaxed text-paper/65">{blurb}</span>
        ) : null}
        {!href && footer ? <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">{footer}</span> : null}
      </span>
    </>
  );

  return (
    <li className={className}>
      {href ? (
        // No prefetch, as a saint's card has none (components/saints/
        // SaintCard.tsx): a list of works scrolled past would fetch every
        // work, and on the website a work's page carries its whole text.
        <Link href={href} prefetch={false} className="press-card flex items-start gap-4 py-4">
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-4 py-4">{body}</div>
      )}
    </li>
  );
}
