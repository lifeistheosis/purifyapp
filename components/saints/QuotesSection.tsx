import Link from "next/link";

import type { Quote } from "@/lib/saints/saints";
import { T } from "@/components/i18n/T";

/**
 * "In his own words": a few lines from the saint's works, verbatim, each with
 * its source, which links to the work where Purify has it. Plain Lora
 * quotations parted by hairlines: no cards and no decorative quote mark.
 */
export function QuotesSection({ quotes, pronoun }: { quotes: Quote[]; pronoun?: "his" | "her" }) {
  return (
    <section aria-labelledby="saint-quotes">
      <h2 id="saint-quotes" className="text-title-sm leading-tight text-paper">
        <T k={pronoun === "her" ? "saints.inHerOwnWords" : "saints.inHisOwnWords"} />
      </h2>
      <ul className="mt-2 max-w-[680px] divide-y divide-paper/8">
        {quotes.map((q, i) => (
          <li key={i} className="py-5">
            <figure>
              <blockquote className="font-serif text-lede leading-[1.55] text-paper/90">{q.text}</blockquote>
              <figcaption className="mt-2 font-sans text-caption text-paper/55">
                {q.href ? (
                  <Link href={q.href} className="underline decoration-paper/25 underline-offset-4 hover:text-paper/80">
                    {q.source}
                  </Link>
                ) : (
                  q.source
                )}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
