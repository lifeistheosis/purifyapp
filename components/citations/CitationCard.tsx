// Shared pull-quote card for a resolved deep-link citation. Used by the
// Topics index ("Confessed" / "Refuted by the Fathers") and the Heresies
// archive ("Refuted by the Fathers"). The whole card is a link into the
// hosted verbatim section it quotes.

import Link from "next/link";
import type { ResolvedCitation } from "@/lib/citations/resolve";

export function CitationCard({ c }: { c: ResolvedCitation }) {
  return (
    <Link
      href={c.href}
      className="block rounded-lg border border-paper/12 bg-paper/[0.03] p-5 hover:border-gold/40 transition-all duration-200"
    >
      {c.gloss ? (
        <p className="font-sans text-caption uppercase tracking-[1.2px] text-gold/85 mb-3">
          {c.gloss}
        </p>
      ) : null}
      <blockquote className="font-serif italic text-body text-paper/90 leading-[1.65]">
        &ldquo;{c.paragraph}&rdquo;
      </blockquote>
      <p className="mt-3 font-sans text-caption text-paper/55">
        {c.saintName}
        <span className="text-paper/30 mx-2">&middot;</span>
        <span className="text-paper/70">{c.workTitle}</span>
        {c.citation ? (
          <>
            <span className="text-paper/30 mx-2">&middot;</span>
            <span className="text-paper/55">{c.citation}</span>
          </>
        ) : null}
      </p>
    </Link>
  );
}
