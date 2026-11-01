"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { Book } from "@/components/ui/icons/Book";
import { CalendarCheck } from "@/components/ui/icons/CalendarCheck";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { Pen } from "@/components/ui/icons/Pen";
import { Sheet } from "@/components/ui/Sheet";
import { bibleCanon, getBook, type BibleBook } from "@/lib/bible/books";
import { dayReadings, readingsOptionsFor } from "@/lib/calendar/orthodox";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { cn } from "@/lib/cn";
import { hrefOf, rangesOf, startReadingsFlow, type FlowItem } from "@/lib/readings/flow";
import { scrollBehavior } from "@/lib/ui/motion";

import { BibleSearch } from "./BibleSearch";

/**
 * The books sheet (1.8, the owner's pick A of r3-20, "Straight into the
 * book"; Homebase/boards/purify-master/variants/r3-20-bible). The Bible tab
 * opens the chapter itself now, so the books are chosen from the chapter:
 * its title and the name on its pill open this (the ••• sheet's Book row
 * went in note 82: it did what the title does).
 *
 *  - The Bible's search over the top, still while the list scrolls under it.
 *  - Both Testaments as one list, in the Church's order (lib/bible/books.ts:
 *    the Pentateuch to the Prophets, then the Gospels to Revelation), in the
 *    rows of the Bible's index (IndexRows.tsx). No Old and New Testament
 *    switch: the owner's note 65, "cut out the whole entire Old Testament
 *    and New Testament selectors".
 *  - It opens on the book being read, its chapters as a grid under its row,
 *    the chapter being read lit white (.reader-lit; ink on Parchment). A tap
 *    on another book opens its grid in its place, and keeps the row where
 *    the finger is.
 *  - At its foot, the three doors the tab's page held: today's readings,
 *    walked one after another as Today walks them, the reading plans and
 *    the journal.
 *
 * Every word is one the app already had. Routing closes the sheet and goes
 * to /bible/{slug}/{chapter}; the Sheet primitive handles the backdrop,
 * Escape, the Android back button and the overlay flag. It rises as every
 * sheet does, and with motion off it is simply there.
 */
export function MobileChapterSheet({
  open,
  onClose,
  currentSlug,
  currentChapter,
}: {
  open: boolean;
  onClose: () => void;
  currentSlug: string;
  currentChapter: number;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  // The book whose chapters show. Each opening starts on the one being read.
  const [openBook, setOpenBook] = useState<string | null>(currentSlug);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenBook(currentSlug);
  }

  const list = useRef<HTMLDivElement | null>(null);
  /** The row just tapped and where it stood, so it stays under the finger. */
  const tapped = useRef<{ slug: string; top: number } | null>(null);

  // As the sheet opens: the book being read in the middle of what it shows,
  // its chapters whole. Once per opening, when the list is drawn.
  const placeList = useCallback((el: HTMLDivElement | null) => {
    list.current = el;
    const scroller = el?.parentElement;
    const block = el?.querySelector<HTMLElement>("[data-open-book]")?.parentElement;
    if (!scroller || !block) return;
    const s = scroller.getBoundingClientRect();
    const b = block.getBoundingClientRect();
    scroller.scrollTop = Math.max(0, b.top - s.top + scroller.scrollTop - Math.max(0, (s.height - b.height) / 2));
  }, []);

  function toggle(slug: string, row: HTMLElement) {
    tapped.current = { slug, top: row.getBoundingClientRect().top };
    setOpenBook((now) => (now === slug ? null : slug));
  }

  // A grid closing above the row would lift it from under the finger: put it
  // back, then bring the opened grid into view if it runs past the foot.
  useLayoutEffect(() => {
    const was = tapped.current;
    tapped.current = null;
    const scroller = list.current?.parentElement;
    const row = was ? list.current?.querySelector<HTMLElement>(`[data-book="${was.slug}"]`) : null;
    if (!was || !scroller || !row) return;
    scroller.scrollBy({ top: row.getBoundingClientRect().top - was.top, behavior: "instant" });
    const grid = openBook === was.slug ? row.nextElementSibling : null;
    if (!grid) return;
    const s = scroller.getBoundingClientRect();
    const over = grid.getBoundingClientRect().bottom + 12 - s.bottom;
    const room = row.getBoundingClientRect().top - s.top;
    if (over > 0 && room > 0) scroller.scrollBy({ top: Math.min(over, room), behavior: scrollBehavior() });
  }, [openBook]);

  function go(slug: string, chapter: number) {
    onClose();
    // The chapter being read is where the reader is: the sheet only goes.
    if (slug === currentSlug && chapter === currentChapter) return;
    router.push(`/bible/${slug}/${chapter}`);
  }

  const name = t(`bible.books.${currentSlug}`);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={getBook(currentSlug) ? `${name} ${currentChapter}` : t("bible.pickABook")}
      // Long, and opened to read from, not to be pulled up first.
      openFull
      lead={<BibleSearch layer onNavigate={onClose} className="pb-2 pt-0.5" />}
      foot={<BooksDoors onClose={onClose} />}
    >
      <div ref={placeList} data-books-sheet="">
        {bibleCanon().map(({ testament, categories }) => (
          <section key={testament} aria-labelledby={`books-${testament}`}>
            <h2 id={`books-${testament}`} className="px-1 pb-0.5 pt-5 font-heading text-[21px] font-bold leading-[1.2] text-paper">
              {t(testament === "OT" ? "bible.theOldTestament" : "bible.theNewTestament")}
            </h2>
            {categories.map((cat) => (
              <div key={cat.label}>
                <p className="px-1 pb-2 pt-3 font-sans text-detail leading-[1.3] text-paper/45">
                  {t(`bible.category.${cat.label.toLowerCase().replace(/ /g, "-")}`)}
                </p>
                <ul className={INDEX_LIST_LOOK}>
                  {cat.books.map((b, i) => (
                    <BookRow
                      key={b.slug}
                      book={b}
                      first={i === 0}
                      open={openBook === b.slug}
                      current={b.slug === currentSlug ? currentChapter : null}
                      onToggle={toggle}
                      onPick={go}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Sheet>
  );
}

/** A book: its row, and its chapters as a grid under it while it is open. */
function BookRow({
  book,
  first,
  open,
  current,
  onToggle,
  onPick,
}: {
  book: BibleBook;
  first: boolean;
  open: boolean;
  /** The chapter being read, when it is in this book. */
  current: number | null;
  onToggle: (slug: string, row: HTMLElement) => void;
  onPick: (slug: string, chapter: number) => void;
}) {
  const { t } = useTranslate();
  const grid = `books-grid-${book.slug}`;
  return (
    <li className={first ? undefined : "border-t border-paper/[0.06]"}>
      <button
        type="button"
        data-book={book.slug}
        data-open-book={open ? "" : undefined}
        aria-expanded={open}
        aria-controls={open ? grid : undefined}
        onClick={(e) => onToggle(book.slug, e.currentTarget)}
        className={cn(
          "flex min-h-[46px] w-full items-center justify-between gap-3 px-4 py-2.5 text-start transition-colors motion-reduce:transition-none active:bg-paper/[0.04]",
          open && "bg-paper/[0.05]",
        )}
      >
        {/* min-w-0 so a long name wraps inside the row and does not push the
            note off its end. */}
        <span className="min-w-0 font-heading text-[16px] font-semibold leading-tight text-paper">
          {t(`bible.books.${book.slug}`)}
        </span>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 font-sans text-detail tabular-nums", open ? "text-paper/70" : "text-paper/45")}>
          {book.chapters} {t("bible.chAbbrev")}
          {open ? <ChevronDown size={15} className="rotate-180" /> : null}
        </span>
      </button>
      {open ? (
        <ul id={grid} className="grid grid-cols-7 gap-1.5 bg-paper/[0.05] px-3 pb-3.5 pt-1">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => {
            const reading = n === current;
            return (
              <li key={n}>
                <button
                  type="button"
                  aria-label={t("bible.chapterN", { n })}
                  aria-current={reading ? "page" : undefined}
                  onClick={() => onPick(book.slug, n)}
                  className={cn(
                    "h-11 w-full rounded-xl font-sans text-ui font-semibold tabular-nums transition-colors motion-reduce:transition-none",
                    reading
                      ? "reader-lit bg-paper text-night"
                      : "bg-paper/[0.04] text-paper/80 ring-1 ring-inset ring-paper/[0.09] active:bg-paper/[0.16] active:text-paper",
                  )}
                >
                  {n}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * The three doors the Bible tab's page held, at the sheet's foot: today's
 * readings (walked one after another, the first opening at its verse, as
 * Today's "Read them in one go" walks them: lib/readings/flow.ts), the
 * reading plans and the journal. Drawn only while the sheet is open, so the
 * day is read then and not on every chapter.
 */
function BooksDoors({ onClose }: { onClose: () => void }) {
  const { t } = useTranslate();
  const today = useToday();
  const [style] = useCalendarStyleDefault();
  // The day's own readings, then the day's under a great feast's, then the
  // saints': all of them, as Today's walk takes them.
  const walk = useMemo<FlowItem[]>(() => {
    if (!today) return [];
    const day = dayReadings(today, readingsOptionsFor(style));
    return [...day.readings, ...day.ordinary, ...day.commemoration].map((r) => ({
      book: r.book,
      chapter: r.chapter,
      ranges: rangesOf(r.label, r.from, r.to),
      label: r.label,
      kind: r.kind,
    }));
  }, [today, style]);
  const door =
    "flex min-w-0 flex-1 flex-col items-center gap-[5px] px-0.5 pb-1 pt-2 text-center font-sans text-caption font-semibold leading-[1.15] text-paper/80 transition-colors motion-reduce:transition-none active:text-paper";
  const icon = "shrink-0 text-paper/85";
  return (
    <nav aria-label={t("plans.studyTools")} data-books-doors="" className="flex border-t border-paper/[0.08] bg-night px-2 pb-1.5 pt-1.5">
      {walk.length > 0 ? (
        <Link
          href={hrefOf(walk[0])}
          onClick={() => {
            startReadingsFlow(walk);
            onClose();
          }}
          className={door}
        >
          <Book size={21} className={icon} />
          {t("readingsFlow.startLabel")}
        </Link>
      ) : null}
      <Link href="/plans" onClick={onClose} className={door}>
        <CalendarCheck size={21} className={icon} />
        {t("plans.title")}
      </Link>
      <Link href="/journal" onClick={onClose} className={door}>
        <Pen size={21} className={icon} />
        {t("journal.title")}
      </Link>
    </nav>
  );
}
