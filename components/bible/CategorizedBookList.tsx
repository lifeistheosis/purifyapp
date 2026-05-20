import Link from "next/link";
import type { BookCategory } from "@/lib/bible/books";
import { hasCommentary } from "@/lib/bible/commentary-index";

// Subtle border tint per category so the eye can group books visually
// without the page becoming a coloring book. Hover deepens the tint.
const CATEGORY_TINTS: Record<string, string> = {
  Pentateuch:
    "border-[#c4a574]/25 hover:border-[#c4a574]/60 hover:bg-[#c4a574]/[0.06]",
  Historical:
    "border-[#7b9b8f]/25 hover:border-[#7b9b8f]/60 hover:bg-[#7b9b8f]/[0.06]",
  Wisdom:
    "border-gold/25 hover:border-gold/60 hover:bg-gold/[0.06]",
  Prophets:
    "border-[#a37b9a]/25 hover:border-[#a37b9a]/60 hover:bg-[#a37b9a]/[0.06]",
  Gospels:
    "border-gold/35 hover:border-gold/65 hover:bg-gold/[0.08]",
  Acts: "border-[#7b9b8f]/30 hover:border-[#7b9b8f]/60 hover:bg-[#7b9b8f]/[0.06]",
  "Pauline Epistles":
    "border-[#9ba8c4]/25 hover:border-[#9ba8c4]/60 hover:bg-[#9ba8c4]/[0.06]",
  "Catholic Epistles":
    "border-[#c49b7b]/25 hover:border-[#c49b7b]/60 hover:bg-[#c49b7b]/[0.06]",
  Revelation:
    "border-[#c1272d]/30 hover:border-[#c1272d]/60 hover:bg-[#c1272d]/[0.06]",
};

const DEFAULT_TINT = "border-paper/15 hover:border-paper/35 hover:bg-paper/8";

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
      <div className="space-y-8">
        {categories.map((cat) => {
          const tint = CATEGORY_TINTS[cat.label] ?? DEFAULT_TINT;
          return (
            <div key={cat.label}>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45 mb-3">
                {cat.label}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {cat.books.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/bible/${b.slug}/1`}
                    className={`group block rounded-md border bg-paper/[0.03] px-3.5 py-3 transition-colors duration-150 ${tint}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="block font-sans text-[14px] font-semibold text-paper truncate leading-tight">
                        {b.name}
                      </span>
                      {hasCommentary(b.slug) && (
                        <span
                          aria-label="Patristic commentary available"
                          title="Patristic commentary available"
                          className="shrink-0 inline-block h-1.5 w-1.5 rounded-full bg-gold"
                        />
                      )}
                    </span>
                    <span className="block font-sans text-[11px] text-paper/50 mt-1 group-hover:text-paper/65 transition-colors">
                      {b.chapters} {b.chapters === 1 ? "chapter" : "chapters"}
                      {hasCommentary(b.slug) && (
                        <span className="text-gold/80"> · Fathers</span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
