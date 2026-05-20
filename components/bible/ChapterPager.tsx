import Link from "next/link";
import {
  nextChapter,
  prevChapter,
  nextBook,
  prevBook,
  getBook,
} from "@/lib/bible/books";

/**
 * End-of-chapter pager. The NEXT chapter gets a big, visually-weighted tile
 * (this is the action most readers take), while previous-chapter and
 * previous/next-book sit as smaller secondary links. Designed to feel like
 * an invitation to keep reading rather than a tab-strip at the bottom.
 */
export function ChapterPager({
  slug,
  chapter,
}: {
  slug: string;
  chapter: number;
}) {
  const prev = prevChapter(slug, chapter);
  const next = nextChapter(slug, chapter);
  const currentBook = getBook(slug);
  const prevBookName = prev ? getBook(prev.slug)?.name : null;
  const nextBookName = next ? getBook(next.slug)?.name : null;

  const pBook = prevBook(slug);
  const nBook = nextBook(slug);

  return (
    <div className="mt-16 pt-8 border-t border-white/8">
      {/* Big NEXT tile — the primary action at chapter end */}
      {next && (
        <Link
          href={`/bible/${next.slug}/${next.chapter}`}
          className="group block rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-6 md:p-7"
        >
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-gold/85 mb-2">
                Continue reading
              </p>
              <h3 className="font-serif text-[26px] md:text-[32px] text-paper leading-tight">
                {nextBookName} {next.chapter}
              </h3>
              <p className="mt-2 font-sans text-[12.5px] text-paper/55">
                {next.slug === slug
                  ? "Next chapter"
                  : `Next book, ${nextBookName} 1`}
              </p>
            </div>
            <span
              aria-hidden
              className="shrink-0 text-paper/55 group-hover:text-gold transition-colors text-[28px]"
            >
              →
            </span>
          </div>
        </Link>
      )}

      {/* Smaller back-link to the previous chapter */}
      {prev && (
        <Link
          href={`/bible/${prev.slug}/${prev.chapter}`}
          className="mt-3 block rounded-md border border-paper/10 bg-paper/[0.02] hover:border-paper/30 hover:bg-paper/[0.04] transition-colors px-5 py-3"
        >
          <span className="block font-sans text-[10.5px] uppercase tracking-[1.5px] text-paper/45">
            Previous chapter
          </span>
          <span className="block mt-1 font-sans text-[14px] text-paper/75">
            ← {prevBookName} {prev.chapter}
          </span>
        </Link>
      )}

      {/* Book pager — small footer row to hop to the first chapter of an
          adjacent book */}
      {(pBook || nBook) && (
        <nav
          aria-label="Jump between books"
          className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between gap-4 font-sans text-[12.5px] text-paper/55"
        >
          {pBook ? (
            <Link
              href={`/bible/${pBook.slug}/1`}
              className="hover:text-paper transition-colors"
            >
              ⇤ {pBook.name}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-paper/30">
            {currentBook?.name}
          </span>
          {nBook ? (
            <Link
              href={`/bible/${nBook.slug}/1`}
              className="hover:text-paper transition-colors"
            >
              {nBook.name} ⇥
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
