import { T } from "@/components/i18n/T";
import { ListenHere } from "@/components/reading/ListenHere";
import { listenId } from "@/lib/listen/texts";
import { MarkHost } from "@/components/reading/MarkHost";
import { SaintNames } from "@/components/saints/SaintNames";
import type { CouncilDocumentContent } from "@/lib/councils/load";
import { textDir } from "@/lib/i18n/textDir";

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
 *
 * Its words say their language and direction, each block of them (build 90
 * note 4): English, or the file's own, left to right under Arabic and Urdu,
 * while the labels between them ("Editor's note") are the reader's.
 */
export function CouncilSections({ content, lang, council }: { content: CouncilDocumentContent; lang?: string; council: { slug: string; name: string } }) {
  const last = content.sections[content.sections.length - 1];
  const text = lang ?? "en";
  return (
    <>
      {content.sections.map((s) => (
        // A section can be opened by its number (#s3, 1.8): a quotation
        // elsewhere in the app links to the canon or decree it quotes. Its
        // title is the page's head (components/saints/WorkHead.tsx).
        <section key={s.n} id={`s${s.n}`} data-council-part={s.n} className="mx-auto max-w-[680px] scroll-mt-24">
          {s.framing && (
            <div className="mb-8">
              <p className="font-sans text-caption font-semibold text-paper/45 mb-2">
                <T k="saints.editorsNote" />
              </p>
              <p lang={text} dir={textDir(text)} className="font-sans text-ui md:text-body text-paper/70 leading-[1.65] italic">
                {s.framing}
              </p>
              {content.review && (
                <p className="mt-2 font-sans text-caption text-paper/45">
                  <T k="study.councils.framingAwaitingReview" />
                </p>
              )}
            </div>
          )}
          {s.citation && (
            <p lang={text} dir={textDir(text)} className="font-sans text-caption text-paper/70 font-semibold mb-4">
              {s.citation}
            </p>
          )}
          {/* The section read aloud, where it has a recording (1.9): the English, as it was recorded. */}
          {text === "en" ? (
            <ListenHere
              id={listenId("council", council.slug, content.slug, s.n)}
              title={s.title && s.title !== content.title ? `${content.title}. ${s.title}` : content.title}
              by={council.name}
              className="mb-5"
            />
          ) : null}
          {/* The document's own words keep their edition's dashes, and say so (lib/ui/__tests__/editionDashes.test.ts); the editor's note above is the house's and never does. */}
          <div lang={text} dir={textDir(text)} className="space-y-5 text-paper/90" data-mock-allow="emdash" data-mock-why="the document's own words, as its edition prints them">
            {s.paragraphs.map((p, i) => (
              // Each paragraph a place the reader's place is kept by (lib/saints/paragraphInView.ts).
              // Any of its words can be marked (1.9, components/reading/MarkHost.tsx).
              <MarkHost
                key={i}
                place={{ kind: "text", text: "council", slug: council.slug, doc: content.slug, sectionN: s.n, paragraphIdx: i }}
                cite={`${council.name}, ${content.title}${s.title && s.title !== content.title ? `, ${s.title}` : ""}`}
                link={`/councils/${council.slug}/${content.slug}#p-${s.n}-${i}`}
                name={council.name}
                work={s.title && s.title !== content.title ? `${content.title}, ${s.title}` : content.title}
              >
                <p id={`p-${s.n}-${i}`} data-place={`${s.n}:${i}`} data-work-end={s === last && i === s.paragraphs.length - 1 ? "" : undefined} data-mk-text="">
                  <SaintNames text={p} />
                </p>
              </MarkHost>
            ))}
          </div>
          {s.notes && s.notes.length > 0 && (
            <aside className="mt-10 border-t border-paper/10 pt-6">
              <p className="font-sans text-caption font-semibold text-paper/45 mb-4">
                <T k="saints.notes" />
              </p>
              <ul className="space-y-4" data-mock-allow="emdash" data-mock-why="the edition's own notes, as it prints them">
                {s.notes.map((n, i) => (
                  <li key={i} lang={text} dir={textDir(text)} className="font-sans text-ui text-paper/70 leading-[1.55]">
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
