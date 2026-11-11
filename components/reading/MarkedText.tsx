import type { ReactNode } from "react";
import Link from "next/link";

import { highlightVars } from "@/lib/bible/highlightColors";
import { pieces, placeMarks, type Mark } from "@/lib/marks/anchor";
import { segmentNames } from "@/lib/saints/nameLinks";

/**
 * A paragraph's words with the reader's marks on them (build 93 note 13): a
 * highlight on any run of words in its colour, and a fine line under words
 * that are only kept or only noted. The words are the text, character for
 * character, whatever is marked (lib/marks/dom.ts counts on it), and each
 * saint the text names still opens the saint's card, once a paragraph, as
 * components/saints/SaintNames.tsx draws it.
 *
 * A mark the text no longer holds is not drawn (lib/marks/anchor.ts, locate);
 * it is still kept.
 */
export function MarkedText({
  text,
  marks,
  skip,
  names = true,
}: {
  text: string;
  marks?: readonly Mark[];
  /** The saint whose page this is: not linked to itself. */
  skip?: string;
  /** Whether saints named in the words are linked. */
  names?: boolean;
}) {
  const done = new Set<string>(skip ? [skip] : []);
  const cut = pieces(text, placeMarks(text, marks));
  const out: ReactNode[] = [];
  cut.forEach((piece, i) => {
    const words = names ? linked(piece.text, done, `${i}-`) : [piece.text];
    const top = piece.marks[0];
    if (!top) {
      out.push(...words);
      return;
    }
    // The newest highlight over these words gives the colour; a note or a kept mark under it still counts.
    const coloured = piece.marks.find((m) => m.color);
    out.push(
      <span
        key={`m${i}`}
        data-mk-id={top.id}
        data-hl-color={coloured?.color}
        style={coloured ? (highlightVars(coloured.color) as React.CSSProperties) : undefined}
        className={
          coloured
            ? "box-decoration-clone cursor-pointer rounded-[4px] bg-[var(--hl-verse)] py-[0.1em] motion-safe:transition-[background-color] motion-safe:duration-200"
            : "cursor-pointer underline decoration-paper/40 decoration-1 underline-offset-[5px]"
        }
      >
        {words}
      </span>,
    );
  });
  return <>{out}</>;
}

function linked(text: string, done: Set<string>, key: string): ReactNode[] {
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
