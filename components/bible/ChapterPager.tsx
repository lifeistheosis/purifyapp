"use client";

import Link from "next/link";
import {
 nextChapter,
 prevChapter,
 nextBook,
 prevBook,
 getBook,
} from "@/lib/bible/books";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";

/**
 * End-of-chapter pager. The NEXT chapter gets a big, visually-weighted tile
 * (this is the action most readers take), while previous-chapter and
 * previous/next-book sit as smaller secondary links. Designed to feel like
 * an invitation to keep reading rather than a tab-strip at the bottom.
 */
export function ChapterPager({
 slug,
 chapter,
 v,
}: {
 slug: string;
 chapter: number;
 /** Active licensed translation (?v=), carried to NT targets so the
  * reader's choice survives next/previous without a flash. */
 v?: string;
}) {
  const { t } = useTranslate();
 const prev = prevChapter(slug, chapter);
 const next = nextChapter(slug, chapter);
 const currentBook = getBook(slug);
 const prevBookName = prev ? t(`bible.books.${prev.slug}`) : null;
 const nextBookName = next ? t(`bible.books.${next.slug}`) : null;

 const pBook = prevBook(slug);
 const nBook = nextBook(slug);

 // Licensed translations are New Testament only; only append ?v= when the
 // destination is also NT so we never carry it into the OT.
 const vq = (targetSlug: string) =>
 v && getBook(targetSlug)?.testament === "NT" ? `?v=${v}` : "";

 return (
 <div className="mt-16 pt-8 border-t border-white/8">
 {/* Big NEXT tile, the primary action at chapter end */}
 {next && (
 <Link
 href={`/bible/${next.slug}/${next.chapter}${vq(next.slug)}`}
 className="group block rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-6 md:p-7"
 >
 <div className="flex items-center justify-between gap-6">
 <div className="min-w-0">
 <p className="font-sans text-caption font-semibold text-gold/85 mb-2">
 {t("bible.continueReading")}
 </p>
 <h3 className="font-serif text-title md:text-heading text-paper leading-tight">
 {nextBookName} {next.chapter}
 </h3>
 <p className="mt-2 font-sans text-caption text-paper/55">
 {next.slug === slug
 ? t("bible.nextChapter")
 : t("bible.nextBookFirstChapter", {
 book: nextBookName ?? "",
 })}
 </p>
 </div>
 <ChevronRight size={24} aria-hidden className="shrink-0 text-paper/55 group-hover:text-gold transition-colors rtl:-scale-x-100" />
 </div>
 </Link>
 )}

 {/* Smaller back-link to the previous chapter */}
 {prev && (
 <Link
 href={`/bible/${prev.slug}/${prev.chapter}${vq(prev.slug)}`}
 className="mt-3 block rounded-md border border-paper/10 bg-paper/[0.02] hover:border-paper/30 hover:bg-paper/[0.04] transition-colors px-5 py-3"
 >
 <span className="block font-sans text-caption text-paper/55">
 {t("bible.previousChapter")}
 </span>
 <span className="mt-1 flex items-center gap-1 font-sans text-ui text-paper/75">
 <ChevronLeft size={14} aria-hidden className="shrink-0 rtl:-scale-x-100" />
 {prevBookName} {prev.chapter}
 </span>
 </Link>
 )}

 {/* Book pager, small footer row to hop to the first chapter of an
 adjacent book */}
 {(pBook || nBook) && (
 <nav
 aria-label={t("bible.jumpBetweenBooks")}
 className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between gap-4 font-sans text-caption text-paper/55"
 >
 {pBook ? (
 <Link
 href={`/bible/${pBook.slug}/1${vq(pBook.slug)}`}
 // 19px of words, 44 to the touch (.hit-44): nothing else to tap within reach.
 className="hit-44 inline-flex items-center gap-1 hover:text-paper transition-colors"
 >
 <ChevronLeft size={14} aria-hidden className="shrink-0 rtl:-scale-x-100" />
 {t(`bible.books.${pBook.slug}`)}
 </Link>
 ) : (
 <span />
 )}
 <span className="text-paper/55">
 {currentBook ? t(`bible.books.${currentBook.slug}`) : null}
 </span>
 {nBook ? (
 <Link
 href={`/bible/${nBook.slug}/1${vq(nBook.slug)}`}
 className="hit-44 inline-flex items-center gap-1 hover:text-paper transition-colors"
 >
 {t(`bible.books.${nBook.slug}`)}
 <ChevronRight size={14} aria-hidden className="shrink-0 rtl:-scale-x-100" />
 </Link>
 ) : (
 <span />
 )}
 </nav>
 )}
 </div>
 );
}
