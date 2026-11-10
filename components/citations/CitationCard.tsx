// A Father's words on a subject, as a topic and a heresy quote them: under
// "Confessed by the Fathers" and "Refuted by the Fathers".
//
// 1.8: the quotation is a Father's own words only (lib/citations/resolve.ts
// chooses them), and under it is the line every quotation in the app has,
// the work by its own numbering and edition, which opens the paragraph
// itself (components/citations/SourceLine.tsx). When the cited text is a
// summary in our voice, the card quotes nothing: the gloss and the line.
//
// 1.9, in the house style with the pages that hold it (components/theology/
// LeafPage.tsx): a raised surface, as a study sets what the councils said
// (components/theology/StudyPartText.tsx, StudyCouncils), where it was an
// outlined box; his face in its round frame beside our line on the passage,
// as a study's contents show the Fathers each part brings (pictures lead);
// that line in the ink, where it was gold; and his words on their own type,
// with no marks typed round them, as every quotation in Theology stands.
//
// His face stands only beside a work that is his own (`ownWork`). A retelling
// in our voice, or a gathering of several Fathers' words kept on one Father's
// page, wears the book on a plate and, with no line of ours, the work's own
// name: a face there would put one Father's name to words that are not his.

import type { ResolvedCitation } from "@/lib/citations/resolve";
import { FatherFace } from "@/components/theology/FatherFace";
import { LEAF_CARD, LEAF_WORDS } from "@/components/theology/wayStyle";
import { Book } from "@/components/ui/icons/Book";

import { SourceLine } from "./SourceLine";
import { VERBATIM } from "./verbatim";

export function CitationCard({ c }: { c: ResolvedCitation }) {
  return (
    <figure data-citation="" className={LEAF_CARD}>
      <div className="flex items-center gap-3">
        {c.ownWork ? (
          <FatherFace father={{ slug: c.saintSlug, name: c.saintName, iconUrl: c.saintIcon }} size={34} />
        ) : (
          <span aria-hidden data-citation-mark="work" className="theology-plate grid size-[34px] shrink-0 place-items-center rounded-[10px] text-paper/85">
            <Book size={17} />
          </span>
        )}
        {/* Our line on what the passage shows; where there is none, his name, or the work's where it is not his. */}
        {c.gloss ? (
          <p lang="en" dir="ltr" className="min-w-0 flex-1 font-sans text-detail leading-[1.5] text-paper/70">
            {c.gloss}
          </p>
        ) : (
          <p lang="en" dir="ltr" className="min-w-0 flex-1 font-serif text-[15px] font-semibold leading-[1.25] text-paper/92">
            {c.ownWork ? c.saintName : c.workTitle}
          </p>
        )}
      </div>
      {c.paragraph ? (
        <blockquote lang="en" dir="ltr" {...VERBATIM} className={`mt-3 ${LEAF_WORDS}`}>
          {c.paragraph}
        </blockquote>
      ) : null}
      {c.cite ? (
        <figcaption className="mt-2.5">
          <SourceLine cite={c.cite} />
        </figcaption>
      ) : null}
    </figure>
  );
}
