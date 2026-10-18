import { SourceLine } from "@/components/citations/SourceLine";
import { T } from "@/components/i18n/T";
import { shownCite } from "@/lib/citations/shown";
import type { Quote } from "@/lib/saints/saints";

/**
 * "In his own words": a few lines from the saint's works, each with where
 * it stands, exactly (1.8): the line every quotation in the app has
 * (components/citations/SourceLine.tsx), read from the quote's `cite`, which
 * opens the words where they stand. A line that is not word for word as its
 * edition prints it, or that no public-domain text we can find carries, says
 * so in place of a source (lib/saints/__tests__/quotes.test.ts holds every
 * one). Plain Lora quotations parted by hairlines: no cards and no
 * decorative quote mark.
 */
export function QuotesSection({ quotes, pronoun }: { quotes: Quote[]; pronoun?: "his" | "her" }) {
  return (
    <section aria-labelledby="saint-quotes">
      <h2 id="saint-quotes" className="text-title-sm leading-tight text-paper">
        <T k={pronoun === "her" ? "saints.inHerOwnWords" : "saints.inHisOwnWords"} />
      </h2>
      <ul className="mt-2 max-w-[680px] divide-y divide-paper/8">
        {quotes.map((q, i) => {
          const cite = shownCite(q.cite);
          return (
            <li key={i} className="py-5">
              <figure>
                <blockquote lang="en" className="font-serif text-lede leading-[1.55] text-paper/90">{q.text}</blockquote>
                <figcaption className="mt-2">
                  {cite ? <SourceLine cite={cite} /> : null}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
