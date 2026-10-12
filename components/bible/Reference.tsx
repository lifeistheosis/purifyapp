import { Fragment } from "react";

/**
 * A reference that wraps between its parts and never inside one.
 *
 * A browser may break a line after a hyphen, so "1 Thessalonians 5:9-13,
 * 24-28" on a narrow row came out as "5:9-13, 24-" and then "28" alone on
 * the next line. A range of verses is one thing to a reader. Each part that
 * holds one is kept whole; the words of the book's name wrap as they did.
 *
 * The text is unchanged: what is copied or read aloud is the reference.
 */
export function Reference({ children }: { children: string }) {
  return children.split(" ").map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? " " : null}
      {/\d-\d/.test(part) ? <span className="whitespace-nowrap">{part}</span> : part}
    </Fragment>
  ));
}
