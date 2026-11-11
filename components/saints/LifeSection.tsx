import { SourceList, marked, type ListedSource } from "@/components/citations/Marked";
import { MarkHost } from "@/components/reading/MarkHost";
import { named } from "@/components/saints/SaintNames";
import { textDir } from "@/lib/i18n/textDir";

/** Where a mark in a saint's life leads: its source, under the life. */
const LIFE_SOURCE = "life-source-";

/**
 * A saint's life, paragraph by paragraph, as it is written: the profile's
 * own words, in Lora at the reading size. No heading of its own: on a phone
 * the switch above it says Life, and the part is labelled by it.
 *
 * A quotation inside it carries a small number where it stands, and its
 * source is listed under the life (1.8, lib/saints/lifeQuotes.ts). Another
 * saint it names opens that saint's card (`named`); `saint` is never linked.
 */
export function LifeSection({ paragraphs, sources = [], saint, name, lang = "en" }: { paragraphs: string[]; sources?: ListedSource[]; saint?: string; name?: string; lang?: string }) {
  if (paragraphs.length === 0) return null;
  return (
    <div className="max-w-[680px]">
      {/* The life says its language, English or the reader's own where it is written in it (build 90 note 4). */}
      <div lang={lang} dir={textDir(lang)} className="space-y-5">
        {paragraphs.map((p, i) => {
          const words = (
            <p key={i} data-mk-text={saint && name ? "" : undefined} className="font-serif text-lede leading-[1.7] text-paper/85">
              {named(marked(p, sources, LIFE_SOURCE), saint)}
            </p>
          );
          // Any of its words can be marked (1.9, components/reading/MarkHost.tsx).
          // The life is Purify's own telling, and a copy or a picture of its
          // words says so: never the saint's name over words the saint did not write.
          return saint && name ? (
            <MarkHost key={i} place={{ kind: "text", text: "life", slug: saint, doc: "-", sectionN: 1, paragraphIdx: i }} cite={`Life of ${name}, Purify`} link={`/saints/${saint}`} name="Purify" work={`Life of ${name}`}>
              {words}
            </MarkHost>
          ) : (
            words
          );
        })}
      </div>
      <SourceList id="life-sources" idPrefix={LIFE_SOURCE} sources={sources} lang="en" heading="h3" className="mt-8 border-t border-paper/8 pt-6" />
    </div>
  );
}
