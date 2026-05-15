import Link from "next/link";
import { cn } from "@/lib/cn";
import type { BibleBook } from "@/lib/bible/books";

export function BookChapterSidebar({
  book,
  current,
}: {
  book: BibleBook;
  current: number;
}) {
  return (
    <aside className="hidden md:block w-[240px] shrink-0 border-r border-white/8 self-stretch">
      <div className="sticky top-[72px] px-5 py-8 max-h-[calc(100dvh-72px)] overflow-y-auto">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/50 mb-2">
          Book
        </p>
        <h2 className="font-sans text-[18px] font-semibold text-paper mb-5">
          {book.name}
        </h2>
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/50 mb-3">
          Chapters
        </p>
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => (
            <Link
              key={ch}
              href={`/bible/${book.slug}/${ch}`}
              className={cn(
                "block text-center font-sans text-[13px] py-1.5 rounded-sm transition-colors",
                ch === current
                  ? "bg-accent/20 text-paper"
                  : "text-paper/65 hover:bg-paper/5 hover:text-paper",
              )}
            >
              {ch}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
