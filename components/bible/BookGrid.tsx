import Link from "next/link";
import type { BibleBook } from "@/lib/bible/books";

export function BookGrid({ books, label }: { books: BibleBook[]; label: string }) {
  return (
    <section className="mt-12 first:mt-0">
      <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-5">
        {label}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {books.map((b) => (
          <Link
            key={b.slug}
            href={`/bible/${b.slug}/1`}
            className="block rounded-pill border border-paper/15 bg-paper/[0.04] px-4 py-3 font-sans text-[14px] font-medium text-paper text-center hover:bg-paper/10 hover:border-paper/30 transition-colors duration-150"
          >
            {b.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
