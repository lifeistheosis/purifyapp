import Link from "next/link";
import { nextChapter, prevChapter, getBook } from "@/lib/bible/books";

export function ChapterPager({ slug, chapter }: { slug: string; chapter: number }) {
  const prev = prevChapter(slug, chapter);
  const next = nextChapter(slug, chapter);
  const prevLabel = prev ? `${getBook(prev.slug)?.name} ${prev.chapter}` : null;
  const nextLabel = next ? `${getBook(next.slug)?.name} ${next.chapter}` : null;

  return (
    <nav className="mt-16 pt-8 border-t border-white/8 flex items-center justify-between gap-4">
      {prev ? (
        <Link
          href={`/bible/${prev.slug}/${prev.chapter}`}
          className="font-sans text-[14px] text-paper/70 hover:text-paper transition-colors"
        >
          <span className="block text-[11px] uppercase tracking-[1.5px] text-paper/40">
            Previous
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
            Next
          </span>
          <span className="block mt-1">{nextLabel} →</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
