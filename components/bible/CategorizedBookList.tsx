import Link from "next/link";
import type { BookCategory } from "@/lib/bible/books";
import { hasCommentary } from "@/lib/bible/commentary-index";

/**
 * One testament's books, grouped by category, in the house library
 * language: serif book names on quiet night-soft cards, one neutral
 * treatment with a gold hover, category headers on a thin gold hairline.
 * The gold dot still marks books with patristic commentary; it never
 * carries meaning alone (the "Fathers" word appears beside the count).
 */
export function CategorizedBookList({
  label,
  categories,
}: {
  label: string;
  categories: BookCategory[];
}) {
  return (
    <section>
      <h2 className="border-b border-gold/20 pb-3 font-display-serif text-title text-paper">
        {label}
      </h2>
      <div className="mt-7 space-y-9">
        {categories.map((cat) => (
          <div key={cat.label}>
            <p className="mb-3 font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold/75">
              {cat.label}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {cat.books.map((b) => (
                <Link
                  key={b.slug}
                  href={`/bible/${b.slug}/1`}
                  className="group block rounded-md border border-paper/10 bg-night-soft/40 px-3.5 py-3 transition-colors duration-150 hover:border-gold/45 hover:bg-gold/[0.05]"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="block truncate font-display-serif text-ui text-paper leading-tight transition-colors group-hover:text-gold">
                      {b.name}
                    </span>
                    {hasCommentary(b.slug) && (
                      <span
                        aria-label="Patristic commentary available"
                        title="Patristic commentary available"
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                      />
                    )}
                  </span>
                  <span className="mt-1 block font-sans text-eyebrow text-paper/55 transition-colors group-hover:text-paper/70">
                    {b.chapters} {b.chapters === 1 ? "chapter" : "chapters"}
                    {hasCommentary(b.slug) && (
                      <span className="text-gold/80"> · Fathers</span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
