// Shared pull-quote card for a resolved deep-link citation. Used by the
// Topics index ("Confessed" / "Refuted by the Fathers") and the Heresies
// archive ("Refuted by the Fathers").
//
// 1.8: the quotation is a Father's own words only (lib/citations/resolve.ts
// chooses them), and under it is the line every quotation in the app has,
// the work by its own numbering and edition, which opens the paragraph
// itself (components/citations/SourceLine.tsx). When the cited text is a
// summary in our voice, the card quotes nothing: the gloss and the line.

import type { ResolvedCitation } from "@/lib/citations/resolve";

import { SourceLine } from "./SourceLine";

export function CitationCard({ c }: { c: ResolvedCitation }) {
  return (
    <figure className="block rounded-lg border border-paper/12 bg-paper/[0.03] p-5">
      {c.gloss ? (
        <p className="font-sans text-caption text-gold/85 mb-3">
          {c.gloss}
        </p>
      ) : null}
      {c.paragraph ? (
        <blockquote lang="en" className="font-serif italic text-body text-paper/90 leading-[1.65] mb-3">
          &ldquo;{c.paragraph}&rdquo;
        </blockquote>
      ) : null}
      <figcaption>
        {c.cite ? <SourceLine cite={c.cite} /> : null}
      </figcaption>
    </figure>
  );
}
