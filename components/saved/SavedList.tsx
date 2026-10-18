"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { HighlightNamesSheet } from "@/components/bible/HighlightNamesSheet";
import { FlorilegiumRow } from "@/components/saved/FlorilegiumRow";
import { KIND_LABEL_KEY, savedSource, savedTitle, shortDate } from "@/components/saved/kinds";
import { SavedRow, verseOf } from "@/components/saved/SavedRow";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { FilterChip } from "@/components/ui/FilterChip";
import { UndoBar } from "@/components/ui/UndoBar";
import { Pen } from "@/components/ui/icons/Pen";
import { Search } from "@/components/ui/icons/Search";
import { Star } from "@/components/ui/icons/Star";
import { readVerseAnnotation, writeVerseAnnotation } from "@/lib/bible/annotations";
import { localBookNames } from "@/lib/bible/books";
import { highlightVars, useHighlightNames } from "@/lib/bible/highlightColors";
import { cn } from "@/lib/cn";
import { removeBookmark, restoreBookmark, useBookmarks, type Bookmark } from "@/lib/bookmarks";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { clearRecentPrayers, useRecentPrayers } from "@/lib/prayers/storage";
import { clearReadingHistory, useReadingHistory } from "@/lib/reading/history";
import { readParagraphAnnotation, writeParagraphAnnotation } from "@/lib/saints/annotations";
import {
  SEARCH_FROM,
  chipsFor,
  colorOf,
  colorsIn,
  inColor,
  inFilter,
  isSavedFilter,
  matchesQuery,
  savedFeed,
  type SavedFilter,
  type SavedItem,
} from "@/lib/saved/feed";
import { useSavedHighlights } from "@/lib/saved/highlights";
import { passageWordsNow, saintNameOf, useSavedPassages } from "@/lib/saved/passages";
import { keptWordsOf } from "@/lib/saved/verseWords";
import { useUndo } from "@/lib/ui/useUndo";
import { useMounted } from "@/lib/useMounted";

/**
 * Your saved (1.7, the owner's note 21: "make it better for phones, cleaner,
 * a simpler UI").
 *
 * One list, newest first: every bookmark, every highlighted verse and, from
 * 1.8, every highlighted paragraph of the Fathers (lib/saved/feed.ts), a
 * verse that is both starred and highlighted being one row. Above it the way
 * to the Florilegium, then one row of chips (All, Verses, Highlights,
 * Writings, Prayers, Saints, Readings, Icons when there are any, History
 * last), and a search once the list is long. Each row is a SavedRow: what it
 * is, the words or the title, where it is from; a tap opens it at its place,
 * a swipe takes it away, and Undo brings it back.
 *
 * What a swipe takes away is what the chip shows. Under Highlights, the
 * highlight (a note on the verse stays, and so does its star). Under All and
 * Verses, the verse: its star and its highlight, since Verses holds every
 * verse kept either way (1.8) and a verse still kept would stay in the list.
 * A paragraph loses its highlight and keeps its note. The removal reaches
 * the server for a signed-in reader (lib/sync), so it does not come back on
 * the next page.
 *
 * History, last of the chips, is what was read and prayed lately, by day,
 * with Clear history. It was the second half of a Saved/History switch.
 *
 * Under Highlights, a second row (1.7.1): a chip for each colour in use, by
 * the reader's name for it once given and by what it is called until then,
 * which shows only that colour; a tap on the chosen one shows them all
 * again. Last in the row, Name colors opens the sheet where they are named
 * (components/bible/HighlightNamesSheet.tsx).
 *
 * /saved?kind=verses opens on a chip (the You tab's rows, the shop's Saved
 * on Icons), read once on arrival.
 */

/** Each chip's name. A closed map, so every key is a literal the key test reads. */
const CHIP_KEY: Record<SavedFilter, string> = {
  all: "common.all",
  verses: "study.saved.verses",
  highlights: "saved.filter.highlights",
  writings: "saved.filter.writings",
  prayers: "nav.prayers",
  saints: "study.saved.saints",
  readings: "saved.filter.readings",
  icons: "saved.filter.icons",
  history: "study.saved.history",
};

export function SavedList() {
  const { t, locale } = useTranslate();
  const mounted = useMounted();
  const { bookmarks } = useBookmarks();
  const highlights = useSavedHighlights();
  const passages = useSavedPassages();
  const reading = useReadingHistory();
  const prayers = useRecentPrayers();
  const { labelOf, colorName, nameOf } = useHighlightNames();
  const { entry, offer, undo } = useUndo();
  // Under Highlights: one colour chosen, or all of them (null).
  const [color, setColor] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);

  const feed = useMemo(() => savedFeed(bookmarks, highlights, passages), [bookmarks, highlights, passages]);
  const historyCount = reading.length + prayers.length;
  const chips = useMemo(() => chipsFor(feed, historyCount), [feed, historyCount]);

  const [chosen, setChosen] = useState<SavedFilter>("all");
  const [query, setQuery] = useState("");
  // /saved?kind=icons: read from the address once, on arrival (no
  // useSearchParams, which would make the static page wait for the client).
  useEffect(() => {
    const kind = new URLSearchParams(window.location.search).get("kind");
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the address
       is only known on the client, after the first paint. */
    if (isSavedFilter(kind)) setChosen(kind);
  }, []);
  // A chip whose last row was taken away falls back to All, not to nothing.
  const filter = chips.includes(chosen) ? chosen : "all";

  const books = useMemo(() => localBookNames(t), [t]);
  const verseLabel = useCallback(
    (book: string, chapter: number, verse: number) => `${books[book] ?? t(`bible.books.${book}`)} ${chapter}:${verse}`,
    [books, t],
  );

  // Everything a row shows, for the search.
  const textOf = useCallback(
    (item: SavedItem) => {
      const v = verseOf(item);
      const b = item.bookmark;
      const p = item.passage ?? null;
      const words = p ? passageWordsNow(p) : null;
      const c = colorOf(item);
      return [
        v ? keptWordsOf(v.book, v.chapter, v.verse) : null,
        v ? verseLabel(v.book, v.chapter, v.verse) : null,
        b ? savedTitle(b) : null,
        b ? savedSource(b) : null,
        b ? t(KIND_LABEL_KEY[b.kind]) : t("saved.kind.highlight"),
        // A highlight is found by its colour's name and by what it means.
        c ? colorName(c) : null,
        c ? nameOf(c) : null,
        p ? saintNameOf(p.saintSlug) : null,
        words?.text ?? null,
        words?.work ?? null,
      ]
        .filter(Boolean)
        .join(" ");
    },
    [colorName, nameOf, t, verseLabel],
  );

  // The colours the highlights wear, for the row under Highlights. A colour
  // whose last highlight was taken away falls back to all of them.
  const colors = useMemo(() => colorsIn(feed.filter((i) => inFilter(i, "highlights"))), [feed]);
  const chosenColor = filter === "highlights" && color !== null && colors.includes(color) ? color : null;

  const shown = useMemo(() => {
    const under = feed.filter((i) => inFilter(i, filter) && inColor(i, chosenColor));
    return query.trim() ? under.filter((i) => matchesQuery(textOf(i), query)) : under;
  }, [feed, filter, chosenColor, query, textOf]);

  const remove = useCallback(
    (item: SavedItem) => {
      const h = item.highlight;
      const b = item.bookmark;
      const p = item.passage ?? null;
      const before = h ? readVerseAnnotation(h.book, h.chapter, h.verse) : null;
      const beforeP = p ? readParagraphAnnotation(p.saintSlug, p.workSlug, p.sectionN, p.paragraphIdx) : null;
      // Under Highlights only the highlight goes; anywhere else the row's
      // whole keeping goes, or it would stay under the chip it was swiped on.
      const unstar = b !== null && filter !== "highlights";
      const unmark = h !== null;
      let gone: Bookmark | null = null;
      if (unstar) gone = removeBookmark(b.id);
      if (unmark && h && before) {
        // The highlight goes; a note on the verse stays where it was written.
        writeVerseAnnotation(h.book, h.chapter, h.verse, { ...before, highlighted: undefined, highlightedWords: undefined, at: undefined, hlAt: undefined });
      }
      if (p && beforeP) {
        // The same for a paragraph of the Fathers: its note stays.
        writeParagraphAnnotation(p.saintSlug, p.workSlug, p.sectionN, p.paragraphIdx, { ...beforeP, highlighted: undefined, at: undefined });
      }
      offer({
        label: t("saved.removed"),
        restore: () => {
          if (gone) restoreBookmark(gone);
          // Back as it was, dated now, so the sync carries the return too.
          if (unmark && h && before) writeVerseAnnotation(h.book, h.chapter, h.verse, { ...before, at: undefined });
          if (p && beforeP) writeParagraphAnnotation(p.saintSlug, p.workSlug, p.sectionN, p.paragraphIdx, { ...beforeP, at: undefined });
        },
      });
    },
    [filter, offer, t],
  );

  if (!mounted) return <div className="mt-6 min-h-[50vh]" />;

  const nothing = feed.length === 0 && historyCount === 0;

  return (
    <div className="mt-6">
      <FlorilegiumRow />

      {nothing ? (
        <p className="mt-10 flex items-center gap-2.5 font-sans text-ui text-paper/70">
          <Star size={18} className="shrink-0 text-paper/55" />
          {t("saved.emptyLine")}
        </p>
      ) : (
        <>
          {chips.length > 1 ? (
            <ChipScroller label={t("saved.filtersLabel")} className="mt-6" gap="gap-2">
              {chips.map((c) => (
                <FilterChip
                  key={c}
                  active={filter === c}
                  onClick={() => {
                    setChosen(c);
                    setColor(null);
                    setQuery("");
                  }}
                >
                  {t(CHIP_KEY[c])}
                </FilterChip>
              ))}
            </ChipScroller>
          ) : null}

          {filter === "highlights" ? (
            <ChipScroller label={t("saved.colorFilterLabel")} className="mt-2" gap="gap-2">
              {colors.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={chosenColor === id}
                  onClick={() => setColor(chosenColor === id ? null : id)}
                  className={cn(
                    "tap-press hit-44 inline-flex min-h-9 items-center gap-2 rounded-pill border px-3.5 font-sans text-detail font-semibold motion-safe:transition-colors",
                    chosenColor === id ? "border-paper bg-paper text-night" : "border-paper/15 text-paper/70 hover:border-paper/35 hover:text-paper",
                  )}
                >
                  <span
                    aria-hidden
                    data-hl-color={id}
                    style={highlightVars(id) as React.CSSProperties}
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--hl-swatch)] shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
                  />
                  {labelOf(id)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setNaming(true)}
                className="tap-press hit-44 inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 font-sans text-detail font-semibold text-paper/70 hover:text-paper active:bg-paper/10"
              >
                <Pen size={14} />
                {t("bible.highlightNames.open")}
              </button>
            </ChipScroller>
          ) : null}

          {filter !== "history" && feed.length >= SEARCH_FROM ? (
            <label className="relative mt-5 flex min-h-12 items-center">
              <span className="sr-only">{t("saved.search")}</span>
              <Search size={17} className="pointer-events-none absolute start-4 text-paper/45" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("saved.search")}
                className="h-12 w-full rounded-pill border border-paper/12 bg-paper/[0.04] pe-4 ps-11 font-sans text-ui text-paper placeholder:text-paper/40 focus:border-paper/30 focus:outline-none"
              />
            </label>
          ) : null}

          {filter === "history" ? (
            <HistoryList reading={reading} prayers={prayers} locale={locale} />
          ) : shown.length > 0 ? (
            <ul data-saved-list="" className="mt-4 divide-y divide-paper/8 border-b border-paper/8">
              {shown.map((item) => (
                <SavedRow key={item.key} item={item} onRemove={remove} verseLabel={verseLabel} />
              ))}
            </ul>
          ) : (
            <p className="mt-8 font-sans text-ui text-paper/60">{query.trim() ? t("saved.noMatch") : t("saved.emptyLine")}</p>
          )}
        </>
      )}

      <UndoBar entry={entry} onUndo={undo} />
      <HighlightNamesSheet open={naming} focusId={chosenColor} onClose={() => setNaming(false)} />
    </div>
  );
}

/* ── History: what was read and prayed lately ─────────────────────────── */

type HistoryItem = { key: string; href: string; label: string; at: number };

/** "Today", "Yesterday", or the date, in the reader's own language. */
function dayBucket(ms: number, locale: string): string {
  const now = new Date();
  const d = new Date(ms);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays <= 1) {
    try {
      const word = new Intl.RelativeTimeFormat(dateLocale(locale), { numeric: "auto" }).format(diffDays <= 0 ? 0 : -1, "day");
      return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
    } catch {
      /* fall through to the date */
    }
  }
  return shortDate(ms, locale, true);
}

function timeLabel(ms: number, locale: string): string {
  try {
    return new Date(ms).toLocaleTimeString(dateLocale(locale), { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function HistoryList({
  reading,
  prayers,
  locale,
}: {
  reading: ReturnType<typeof useReadingHistory>;
  prayers: ReturnType<typeof useRecentPrayers>;
  locale: string;
}) {
  const { t } = useTranslate();
  const items = useMemo<HistoryItem[]>(
    () =>
      [
        ...reading.map((e) => ({ key: `r:${e.href}`, href: e.href, label: e.label, at: e.at })),
        ...prayers.map((p) => ({ key: `p:${p.id}`, href: p.href, label: p.title, at: p.at })),
      ].sort((a, b) => b.at - a.at),
    [reading, prayers],
  );

  const groups: { bucket: string; items: HistoryItem[] }[] = [];
  for (const it of items) {
    const bucket = dayBucket(it.at, locale);
    const last = groups[groups.length - 1];
    if (last && last.bucket === bucket) last.items.push(it);
    else groups.push({ bucket, items: [it] });
  }

  return (
    <div className="mt-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            clearReadingHistory();
            clearRecentPrayers();
          }}
          className="tap-press inline-flex min-h-11 items-center rounded-pill px-3 font-sans text-caption font-semibold text-paper/55 hover:text-paper"
        >
          {t("study.clearHistory")}
        </button>
      </div>
      {groups.map((g) => (
        <section key={g.bucket} className="mt-4 first:mt-1">
          <p role="heading" aria-level={2} className="font-sans text-caption font-semibold text-paper/55">
            {g.bucket}
          </p>
          <ul className="mt-1 divide-y divide-paper/8 border-b border-paper/8">
            {g.items.map((it) => (
              <li key={it.key}>
                <Link href={it.href} className="flex min-h-12 items-center gap-3 py-3 active:opacity-80">
                  <span className="min-w-0 flex-1 truncate font-sans text-ui text-paper">{it.label}</span>
                  <span className="shrink-0 font-sans text-caption tabular-nums text-paper/50">{timeLabel(it.at, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
