import Link from "next/link";
import type { BookCategory } from "@/lib/bible/books";

export function CategorizedBookList({
  label,
  categories,
}: {
  label: string;
  categories: BookCategory[];
}) {
  return (
    <section>
      <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-6">
        {label}
      </p>
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.label}>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45 mb-2.5">
              {cat.label}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-1.5">
              {cat.books.map((b) => (
                <Link
                  key={b.slug}
                  href={`/bible/${b.slug}/1`}
                  className="block rounded-pill border border-paper/15 bg-paper/[0.04] px-3 py-2 font-sans text-[12.5px] font-medium text-paper text-center truncate hover:bg-paper/10 hover:border-paper/30 transition-colors duration-150"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
