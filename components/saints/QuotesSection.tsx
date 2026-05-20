import Link from "next/link";
import type { Quote } from "@/lib/saints/saints";

/**
 * "In his own words" — a set of notable quotations on the saint profile,
 * rendered between the Life and the Works. Each quote links to the work it
 * is drawn from where available.
 */
export function QuotesSection({ quotes }: { quotes: Quote[] }) {
  return (
    <section className="py-14 border-b border-paper/8">
      <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-6">
        In his own words
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[900px]">
        {quotes.map((q, i) => {
          const cite = (
            <span className="font-sans text-[12px] uppercase tracking-[1.2px] text-paper/45">
              {q.source}
            </span>
          );
          return (
            <figure
              key={i}
              className="rounded-lg border border-paper/8 bg-night/40 p-6 flex flex-col gap-4"
            >
              <blockquote className="font-serif text-[19px] md:text-[20px] text-paper/90 leading-[1.55]">
                <span aria-hidden className="text-gold/70 mr-1">
                  &ldquo;
                </span>
                {q.text}
              </blockquote>
              <figcaption className="mt-auto">
                {q.href ? (
                  <Link
                    href={q.href}
                    className="hover:text-paper/70 transition-colors"
                  >
                    {cite}
                  </Link>
                ) : (
                  cite
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
