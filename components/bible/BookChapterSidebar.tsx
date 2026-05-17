import Link from "next/link";
import { cn } from "@/lib/cn";
import { nextBook, prevBook, type BibleBook } from "@/lib/bible/books";

export function BookChapterSidebar({
  book,
  current,
}: {
  book: BibleBook;
  current: number;
}) {
  const prev = prevBook(book.slug);
  const next = nextBook(book.slug);

  return (
    <aside className="hidden md:block w-[240px] shrink-0 border-r border-white/8 self-stretch">
      <div className="sticky top-[72px] px-5 py-8 max-h-[calc(100dvh-72px)] overflow-y-auto scrollbar-thin">
        <Link
          href="/bible"
          className="inline-flex items-center font-sans text-[11px] uppercase tracking-[1.5px] text-paper/45 hover:text-paper transition-colors mb-4"
        >
          ← All books
        </Link>

        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/50 mb-2">
          Book
        </p>
        <div className="flex items-center justify-between gap-2 mb-5">
          {prev ? (
            <Link
              href={`/bible/${prev.slug}/1`}
              aria-label={`Previous book: ${prev.name}`}
              title={prev.name}
              className="h-7 w-7 shrink-0 rounded-full border border-paper/15 flex items-center justify-center text-paper/55 hover:text-paper hover:border-paper/35 transition-colors"
            >
              ‹
            </Link>
          ) : (
            <span className="h-7 w-7 shrink-0" aria-hidden />
          )}
          <h2 className="font-sans text-[18px] font-semibold text-paper text-center truncate flex-1 min-w-0">
            {book.name}
          </h2>
          {next ? (
            <Link
              href={`/bible/${next.slug}/1`}
              aria-label={`Next book: ${next.name}`}
              title={next.name}
              className="h-7 w-7 shrink-0 rounded-full border border-paper/15 flex items-center justify-center text-paper/55 hover:text-paper hover:border-paper/35 transition-colors"
            >
              ›
            </Link>
          ) : (
            <span className="h-7 w-7 shrink-0" aria-hidden />
          )}
        </div>

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
