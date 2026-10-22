import type { ReactNode } from "react";
import Link from "next/link";

import { segmentNames } from "@/lib/saints/nameLinks";

/**
 * A text with each saint it names opening the saint's card (1.8,
 * lib/saints/nameLinks.ts): the first naming of each, full names and known
 * forms only. The link keeps the text's own colour and size, marked by a
 * faint underline that firms on hover, so a page of the Fathers still reads
 * as a page. `skip` is the saint whose page this is.
 */
export function SaintNames({ text, skip }: { text: string; skip?: string }) {
  const parts = linked(text, skip ? new Set([skip]) : new Set());
  return parts.length === 1 ? parts[0] : parts;
}

/** The text's pieces, links in place, adding each linked saint to `done`. */
function linked(text: string, done: Set<string>, key = ""): ReactNode[] {
  return segmentNames(text, done).map((p, i) =>
    p.slug ? (
      <Link
        key={`${key}${i}`}
        href={`/saints/${p.slug}`}
        className="underline decoration-paper/25 decoration-1 underline-offset-[3px] hover:decoration-paper/70 transition-colors"
      >
        {p.text}
      </Link>
    ) : (
      p.text
    ),
  );
}

/**
 * The saints named in a text that `marked` (components/citations/Marked.tsx)
 * has already cut around its source numbers: the plain pieces get their
 * links, each saint once across the whole paragraph, and the numbers stay as
 * they are.
 */
export function named(node: ReactNode, skip?: string): ReactNode {
  const done = new Set<string>(skip ? [skip] : []);
  if (typeof node === "string") return linked(node, done);
  if (!Array.isArray(node)) return node;
  return node.flatMap((n, i) => (typeof n === "string" ? linked(n, done, `n${i}-`) : [n]));
}
