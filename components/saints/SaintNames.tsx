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
  const parts = segmentNames(text, skip);
  if (parts.length === 1 && !parts[0].slug) return text;
  return parts.map((p, i) =>
    p.slug ? (
      <Link
        key={i}
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
