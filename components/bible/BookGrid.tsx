import Link from "next/link";
import type { BibleBook } from "@/lib/bible/books";

export function BookGrid({ books, label }: { books: BibleBook[]; label: string }) {
  return (
    <section>
      <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60 mb-5">
        {label}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-1.5">
        {books.map((b) => (
          <Link
            key={b.slug}
            href={`/bible/${b.slug}/1`}
            className="block rounded-pill border border-paper/15 bg-paper/[0.04] px-3 py-2 font-sans text-caption font-medium text-paper text-center truncate hover:bg-paper/10 hover:border-paper/30 transition-colors duration-150"
          >
            {b.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
