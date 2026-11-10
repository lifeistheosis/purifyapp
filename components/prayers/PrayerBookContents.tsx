"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import { FIRST_OPEN, prayerBook, type BookChapter, type BookLine } from "@/lib/prayers/book";
import type { HourSlug } from "@/lib/prayers/hourNow";
import { cropStyle, plateCrop } from "@/lib/prayers/iconCrops";
import type { RuleMeta } from "@/lib/prayers/rules";
import { serviceArt } from "@/lib/prayers/serviceArt";
import { glidePageBy } from "@/lib/ui/glideScroll";
import { visibleBand } from "@/lib/ui/readingPlace";
import { prefersReducedMotion } from "@/lib/ui/motion";

/**
 * The prayer book on a phone (1.8, note 72): the owner's pick of r3-26, "C,
 * one prayer book" (Homebase/boards/purify-master/variants/
 * r3-26-prayers-practices). One card, its chapters I to IV (lib/prayers/
 * book.ts) opening one at a time onto a page of their prayers, each run to its
 * length by a dotted leader, read like a printed book's contents. The daily
 * rule is open at first. A shut chapter names what is in it, so the whole
 * book can be looked over without opening anything; the line under each
 * prayer stays on its own page, and what is planned is named at a page's
 * foot.
 *
 * The Hours stand in the daily rule as one row, lit by the clock once the
 * page knows the hour (`hourNow`, read after mount by PrayersMobile, as the
 * Hours' timeline does): until then the row reads as it will and nothing is
 * lit, so nothing moves when the answer comes.
 *
 * A chapter opening below one that shuts above it would be carried up the
 * screen as the page above it closes. So the page above shuts at once and the
 * tapped chapter is put back where the finger left it before the screen is
 * painted (as the Bible's books sheet does), and its own page opens under
 * it. The card keeps scroll anchoring out (.prayer-book), so this is the
 * same on both engines.
 *
 * And the card holds its length while it does (`min-height`, until the new
 * page has opened into the room). The book closes the Prayers tab, so a
 * reader opening Devotional is often scrolled to the foot of the screen: the
 * daily rule shutting there made the page 321px shorter at once, the browser
 * pulled the scroll up to the new foot (a page cannot be scrolled past its
 * end, so the chapter could not be put back), and as Devotional's page grew
 * the scroll went down with it again, carrying the tapped chapter 278px up
 * the screen (build 87's walk, section 48). Held, the page never shortens
 * under the finger, so the chapter can always be put back; the hold lets go
 * once the fold has run, and at once with Purify's motion off.
 *
 * And the screen follows the page as it opens (1.9, build 89 note 8, his
 * words: "I don't like how it doesn't move the screen also down in a smooth
 * way"). Put back under the finger, a chapter opened near the foot of the
 * screen unfolded under the tab bar, out of sight. Now, when its page would
 * end out of sight, the screen glides with the fold, on the same curve and in
 * the same time, carrying the chapter's title up towards the top (never under
 * the header), so its first prayers are in sight when the fold ends. A page
 * that opens in sight is not moved; with Purify's motion off it opens in
 * place, at once, as before.
 */

/** How long a page takes to open (.book-fold in app/globals.css). */
const FOLD_MS = 240;
/** And a frame or two over, for the hold. */
const FOLD_HOLD_MS = FOLD_MS + 80;
/** The room kept between the opened page and the bars, top and foot. */
const CLEAR_PX = 12;

/**
 * How far the screen should go for a chapter opening: enough for its page to
 * end above the lowest bar (the tab bar, the mini player), but never so far
 * that its title goes under the header. Zero when it opens in sight. Pure, for
 * its test: heights from the top of the screen.
 */
export function followBy({ titleTop, pageBottom, roof, floor }: { titleTop: number; pageBottom: number; roof: number; floor: number }): number {
  const hidden = pageBottom - (floor - CLEAR_PX);
  if (hidden <= 0) return 0;
  return Math.max(0, Math.min(hidden, titleTop - (roof + CLEAR_PX)));
}


const BOOK_BG = {
  background:
    "radial-gradient(115% 70% at 88% 4%, rgba(255,255,255,0.06) 0%, transparent 55%), linear-gradient(170deg, #26262b 0%, #1b1b1e 45%, #161619 100%)",
};

/** The one akathist the book carries (lib/prayers/akathists.ts), named under the row. */
const AKATHIST_KEY = "prayers.akathist.theotokos.title";

type Open = { at: number | null; snap: number | null };

export function PrayerBookContents({ hourNow }: { hourNow: HourSlug | null }) {
  const { t, tn } = useTranslate();
  const id = useId();
  const chapters = prayerBook();
  const [open, setOpen] = useState<Open>({ at: FIRST_OPEN, snap: null });
  const book = useRef<HTMLDivElement | null>(null);
  /** The chapter just tapped and where it stood, so it stays under the finger. */
  const tapped = useRef<{ at: number; top: number } | null>(null);
  /** When the card lets go of the length it held. */
  const letGo = useRef<number | undefined>(undefined);

  /** The glide under way, to stop when another chapter is tapped. */
  const follow = useRef<() => void>(() => {});

  function toggle(at: number, head: HTMLElement) {
    follow.current();
    tapped.current = { at, top: head.getBoundingClientRect().top };
    // The page shutting above the one opening shuts at once, and the card
    // holds its length until the new page has opened into it.
    const next: Open = open.at === at ? { at: null, snap: null } : { at, snap: open.at !== null && open.at < at ? open.at : null };
    const card = book.current;
    if (next.snap !== null && card) card.style.minHeight = `${card.offsetHeight}px`;
    setOpen(next);
  }

  useLayoutEffect(() => {
    const was = tapped.current;
    tapped.current = null;
    const card = book.current;
    const head = was ? card?.querySelector<HTMLElement>(`[data-chapter-at="${was.at}"]`) : null;
    if (was && head) {
      const off = head.getBoundingClientRect().top - was.top;
      if (Math.abs(off) > 1) window.scrollBy({ top: off, left: 0, behavior: "instant" as ScrollBehavior });
      // Opened: follow its page as it folds open, when it would end out of sight.
      const page = open.at === was.at ? document.getElementById(head.getAttribute("aria-controls") ?? "")?.firstElementChild : null;
      if (page instanceof HTMLElement && !prefersReducedMotion()) {
        const title = head.getBoundingClientRect();
        // The part of the screen the page is seen through: clear of the
        // header, the tab bar, the mini player and the phone's own edges.
        const band = visibleBand();
        const by = followBy({ titleTop: title.top, pageBottom: title.bottom + page.scrollHeight, roof: band.top, floor: band.bottom });
        if (by > 0) follow.current = glidePageBy(by, { ms: FOLD_MS });
      }
    }
    if (card?.style.minHeight) {
      window.clearTimeout(letGo.current);
      const release = () => {
        card.style.minHeight = "";
      };
      if (prefersReducedMotion()) release();
      else letGo.current = window.setTimeout(release, FOLD_HOLD_MS);
    }
  }, [open]);

  useEffect(
    () => () => {
      window.clearTimeout(letGo.current);
      follow.current();
    },
    [],
  );

  // A catalog title when the rule has one, else the registry's English: a
  // missing key must never reach the screen as the key itself.
  const title = (r: RuleMeta) => {
    const key = `prayers.rule.${r.id}.title`;
    const v = t(key);
    return v === key ? r.title : v;
  };
  const name = (line: BookLine) =>
    line.kind === "prayer"
      ? title(line.rule)
      : line.kind === "today"
        ? // "Today's prayer", the page's own name, already in every catalog.
          t("notFound.todaysPrayer")
        : line.kind === "hours"
          ? t("ui.theHours")
          : t("prayers.akathists");

  return (
    <div
      ref={book}
      data-prayer-book=""
      className="prayer-book lm-card relative overflow-hidden rounded-[28px] py-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-paper/10"
      style={BOOK_BG}
    >
      {chapters.map((chapter, i) => (
        <Chapter
          key={chapter.category}
          chapter={chapter}
          at={i}
          pageId={`${id}-${i}`}
          isOpen={open.at === i}
          snap={open.snap === i}
          onToggle={toggle}
          preview={chapter.lines.map(name).join(", ")}
        >
          <ul>
            {chapter.lines.map((line) =>
              line.kind === "prayer" ? (
                <Leader key={line.rule.id} href={line.rule.href} title={name(line)} length={line.rule.estimatedMinutes ? tn("prayers.approxMin", line.rule.estimatedMinutes) : null} />
              ) : line.kind === "today" ? (
                <Leader key="today" href={line.href} title={name(line)} length={null} />
              ) : line.kind === "hours" ? (
                <IconRow
                  key="hours"
                  href={line.href}
                  name={name(line)}
                  // The Hour the clock is in, named; until the page knows the
                  // hour, the Hours' own line, so the row reads as it will.
                  line={hourNow ? `${t(`prayers.rule.${hourNow}.title`)} · ${t("prayers.hoursIndex.nowMark")}` : t("ui.sanctifyTheDay")}
                  art={hourNow}
                  lit={hourNow !== null}
                />
              ) : (
                <IconRow key="akathists" href={line.href} name={name(line)} line={t(AKATHIST_KEY)} art="akathist-theotokos" />
              ),
            )}
          </ul>
          {chapter.planned.length > 0 ? (
            <p className="px-3 pb-2 pt-2 font-sans text-caption leading-[1.55] text-paper/45">
              <span className="font-semibold text-paper/55">{t("study.planned")}</span>
              {" · "}
              {chapter.planned.map(title).join(", ")}
            </p>
          ) : null}
        </Chapter>
      ))}
    </div>
  );
}

/** A chapter: its number and name, what is in it while it is shut, and its page. */
function Chapter({
  chapter,
  at,
  pageId,
  isOpen,
  snap,
  onToggle,
  preview,
  children,
}: {
  chapter: BookChapter;
  at: number;
  pageId: string;
  isOpen: boolean;
  /** Shut at once, not folded: it was open above the chapter just opened. */
  snap: boolean;
  onToggle: (at: number, head: HTMLElement) => void;
  preview: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslate();
  return (
    <section className="book-chapter relative" data-chapter={chapter.category}>
      <h3>
        <button
          type="button"
          data-chapter-at={at}
          aria-expanded={isOpen}
          aria-controls={pageId}
          onClick={(e) => onToggle(at, e.currentTarget)}
          className={cn(
            "flex w-full items-start gap-3 ps-4 pe-3.5 pt-3.5 text-start transition-colors duration-150 active:bg-paper/[0.03] motion-reduce:transition-none",
            isOpen ? "pb-2.5" : "pb-3.5",
          )}
        >
          <span
            aria-hidden
            className={cn("w-[22px] shrink-0 font-serif text-[15px] font-medium italic leading-[22px]", isOpen ? "text-paper/70" : "text-paper/45")}
          >
            {chapter.numeral}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block text-[17.5px] leading-[22px]", isOpen ? "text-paper" : "text-paper/93")}>{t(chapter.nameKey)}</span>
            {isOpen ? null : (
              <span className="mt-[3px] line-clamp-2 font-sans text-[12.5px] font-normal leading-[1.42] text-paper/48">{preview}</span>
            )}
          </span>
          <ChevronDown size={17} className="book-turn mt-[3px] shrink-0 text-paper/50" />
        </button>
      </h3>
      {/* Shut, its page is inert: not read out, not reached by Tab. */}
      <div id={pageId} inert={!isOpen} data-open={isOpen || undefined} data-snap={snap || undefined} className="book-fold">
        <div>
          <div className="book-page">
            <div className="book-leaf mx-2.5 mb-2.5 rounded-[18px] px-1 py-1.5">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A prayer on the page: its name, a dotted leader and its length. */
function Leader({ href, title, length }: { href: string; title: string; length: string | null }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center gap-2 rounded-[12px] px-3 py-2.5 transition-colors duration-150 hover:bg-paper/[0.04] active:bg-paper/[0.06] motion-reduce:transition-none"
      >
        {/* The leader and the length sit on the name's last line. */}
        <span className="flex min-w-0 flex-1 items-baseline-last gap-2">
          <span className="min-w-0 font-serif text-[15.5px] font-semibold leading-[1.25] text-paper/92">{title}</span>
          <span aria-hidden className="book-leader h-1 min-w-3.5 flex-1" />
          {length ? <span className="shrink-0 font-sans text-[12.5px] tabular-nums text-paper/55">{length}</span> : null}
        </span>
        <ChevronRight size={13} className="shrink-0 text-paper/34 rtl:-scale-x-100" />
      </Link>
    </li>
  );
}

/** A practice in the book, the Hours or the akathists: its icon on a plate, its name, one line. */
function IconRow({ href, name, line, art, lit = false }: { href: string; name: string; line: string; art: string | null; lit?: boolean }) {
  const icon = art ? serviceArt(art) : null;
  return (
    <li>
      <Link
        href={href}
        data-lit={lit || undefined}
        className={cn(
          "my-0.5 flex items-center gap-3 rounded-[14px] py-2 ps-2.5 pe-3 transition-colors duration-150 motion-reduce:transition-none",
          lit ? "book-lit" : "hover:bg-paper/[0.04] active:bg-paper/[0.06]",
        )}
      >
        <span aria-hidden className="book-plate relative h-10 w-[30px] shrink-0 overflow-hidden rounded-[6px] bg-night-soft shadow-[0_6px_14px_-6px_rgba(0,0,0,0.8)]">
          {icon ? (
            <ArrivingImage
              src={icon.src}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              style={cropStyle(plateCrop(icon.slug))}
            />
          ) : null}
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-paper/12" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("book-lit-name block font-serif text-[15.5px] font-semibold leading-[1.2]", lit ? "text-paper" : "text-paper/93")}>{name}</span>
          <span className={cn("mt-0.5 block font-sans text-caption leading-[1.35]", lit ? "text-paper/85" : "text-paper/55")}>{line}</span>
        </span>
        <ChevronRight size={14} className={cn("shrink-0 rtl:-scale-x-100", lit ? "text-paper/80" : "text-paper/34")} />
      </Link>
    </li>
  );
}
