import Link from "next/link";
import {
  nextChapter,
  prevChapter,
  nextBook,
  prevBook,
  getBook,
} from "@/lib/bible/books";

export function ChapterPager({ slug, chapter }: { slug: string; chapter: number }) {
  const prev = prevChapter(slug, chapter);
  const next = nextChapter(slug, chapter);
  const prevLabel = prev ? `${getBook(prev.slug)?.name} ${prev.chapter}` : null;
  const nextLabel = next ? `${getBook(next.slug)?.name} ${next.chapter}` : null;

  const pBook = prevBook(slug);
  const nBook = nextBook(slug);

  return (
    <div className="mt-16 pt-8 border-t border-white/8 space-y-6">
      {/* Chapter pager */}
      <nav className="flex items-center justify-between gap-4">
        {prev ? (
          <Link
            href={`/bible/${prev.slug}/${prev.chapter}`}
            className="font-sans text-[14px] text-paper/70 hover:text-paper transition-colors"
          >
            <span className="block text-[11px] uppercase tracking-[1.5px] text-paper/40">
              Previous chapter
            </span>
            <span className="block mt-1">← {prevLabel}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/bible/${next.slug}/${next.chapter}`}
            className="font-sans text-[14px] text-paper/70 hover:text-paper transition-colors text-right"
          >
            <span className="block text-[11px] uppercase tracking-[1.5px] text-paper/40">
              Next chapter
            </span>
            <span className="block mt-1">{nextLabel} →</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* Book pager — jump to first chapter of prev/next book */}
      {(pBook || nBook) && (
        <nav
          aria-label="Jump between books"
          className="flex items-center justify-between gap-4 pt-4 border-t border-white/5"
        >
          {pBook ? (
            <Link
              href={`/bible/${pBook.slug}/1`}
              className="font-sans text-[13px] text-paper/55 hover:text-paper transition-colors"
            >
              <span className="block text-[11px] uppercase tracking-[1.5px] text-paper/35">
                Previous book
              </span>
              <span className="block mt-1">⇤ {pBook.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {nBook ? (
            <Link
              href={`/bible/${nBook.slug}/1`}
              className="font-sans text-[13px] text-paper/55 hover:text-paper transition-colors text-right"
            >
              <span className="block text-[11px] uppercase tracking-[1.5px] text-paper/35">
                Next book
              </span>
              <span className="block mt-1">{nBook.name} ⇥</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
