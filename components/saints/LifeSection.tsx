import { SourceList, marked, type ListedSource } from "@/components/citations/Marked";

/** Where a mark in a saint's life leads: its source, under the life. */
const LIFE_SOURCE = "life-source-";

/**
 * A saint's life, paragraph by paragraph, as it is written: the profile's
 * own words, in Lora at the reading size. No heading of its own: on a phone
 * the switch above it says Life, and the part is labelled by it.
 *
 * A quotation inside it carries a small number where it stands, and its
 * source is listed under the life (1.8, lib/saints/lifeQuotes.ts).
 */
export function LifeSection({ paragraphs, sources = [] }: { paragraphs: string[]; sources?: ListedSource[] }) {
  if (paragraphs.length === 0) return null;
  return (
    <div className="max-w-[680px]">
      <div className="space-y-5">
        {paragraphs.map((p, i) => (
          <p key={i} className="font-serif text-lede leading-[1.7] text-paper/85">
            {marked(p, sources, LIFE_SOURCE)}
          </p>
        ))}
      </div>
      <SourceList id="life-sources" idPrefix={LIFE_SOURCE} sources={sources} lang="en" heading="h3" className="mt-8 border-t border-paper/8 pt-6" />
    </div>
  );
}
