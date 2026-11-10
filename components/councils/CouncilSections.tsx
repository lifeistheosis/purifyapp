import { T } from "@/components/i18n/T";
import { SaintNames } from "@/components/saints/SaintNames";
import type { CouncilDocumentContent } from "@/lib/councils/load";

/**
 * A council's document's sections as its page draws them (1.8): each one a
 * page of the room's reader, opened by its number (#s3) from a quotation
 * elsewhere in the app, with the editor's note above the conciliar text, the
 * source's eyebrow, the paragraphs the reader's place is kept by, and the
 * notes below.
 *
 * Drawn by the page, which writes the English, and by the device, which sets
 * a reader's own language from its file where the document has one (1.9,
 * components/councils/CouncilTextHere.tsx): one drawing, so the two cannot
 * differ. A translation keeps the English sections' numbers and paragraphs
 * (lib/i18n/__tests__/serverLocale.test.ts), so the reader's place is the
 * same place in either.
 */
export function CouncilSections({ content, lang }: { content: CouncilDocumentContent; lang?: string }) {
  const last = content.sections[content.sections.length - 1];
  return (
    <>
      {content.sections.map((s) => (
        // A section can be opened by its number (#s3, 1.8): a quotation
        // elsewhere in the app links to the canon or decree it quotes. Its
        // title is the page's head (components/saints/WorkHead.tsx).
        <section key={s.n} id={`s${s.n}`} lang={lang} data-council-part={s.n} className="mx-auto max-w-[680px] scroll-mt-24">
          {s.framing && (
            <div className="mb-8">
              <p className="font-sans text-caption font-semibold text-paper/45 mb-2">
                <T k="saints.editorsNote" />
              </p>
              <p className="font-sans text-ui md:text-body text-paper/70 leading-[1.65] italic">{s.framing}</p>
              {content.review && (
                <p className="mt-2 font-sans text-caption text-paper/45">
                  <T k="study.councils.framingAwaitingReview" />
                </p>
              )}
            </div>
          )}
          {s.citation && <p className="font-sans text-caption text-paper/70 font-semibold mb-4">{s.citation}</p>}
          <div className="space-y-5 text-paper/90">
            {s.paragraphs.map((p, i) => (
              // Each paragraph a place the reader's place is kept by (lib/saints/paragraphInView.ts).
              <p key={i} id={`p-${s.n}-${i}`} data-place={`${s.n}:${i}`} data-work-end={s === last && i === s.paragraphs.length - 1 ? "" : undefined}>
                <SaintNames text={p} />
              </p>
            ))}
          </div>
          {s.notes && s.notes.length > 0 && (
            <aside className="mt-10 border-t border-paper/10 pt-6">
              <p className="font-sans text-caption font-semibold text-paper/45 mb-4">
                <T k="saints.notes" />
              </p>
              <ul className="space-y-4">
                {s.notes.map((n, i) => (
                  <li key={i} className="font-sans text-ui text-paper/70 leading-[1.55]">
                    {n}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </section>
      ))}
    </>
  );
}
