"use client";

// The journal's list (1.7, the owner's note 23: "entries by day in one calm
// list (the words first, the date small)").
//
// The day's groups under Today, Yesterday or the weekday, each past day
// headed as a diary's page is (1.9, docs/1.9-build/JOURNAL.md): the weekday in
// Lora, then its date, its feast or saints and its fast, by the reader's
// calendar (lib/journal/churchDay.ts). Today's own line is on today's page
// above the list (components/journal/TodayPage.tsx), so here today is the
// word alone. In each,
// every entry's words first in Lora, then one small line: what kind it is,
// what it is about, the time. A tap opens it in the writing sheet; a swipe
// takes it away, with Undo. Above the list the kinds to filter by and, once
// there are more than five entries, a search. No gold: the reference that
// used to lead each note in the premium ink now follows the words, small.

import { useMemo, useState } from "react";

import { PlusMark } from "@/components/billing/PlusMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { KIND_KEY } from "@/components/journal/JournalComposer";
import { useVerseCardLabel } from "@/components/journal/PageBlocks";
import { SearchField } from "@/components/search/SearchField";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { FilterChip } from "@/components/ui/FilterChip";
import { ClosedBook } from "@/components/ui/icons/ClosedBook";
import { Search } from "@/components/ui/icons/Search";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { churchDayLine, dayFromKey } from "@/lib/journal/churchDay";
import { pageText, parsePage } from "@/lib/journal/page";
import type { JournalSource } from "@/lib/journal/entries";
import { byDay, filterKind, journalChips, localDayKey, type JournalFilter, type JournalItem } from "@/lib/journal/feed";
import { matchesQuery } from "@/lib/saved/feed";

/** Each chip's name, a closed map of literal keys. */
const FILTER_KEY: Record<JournalFilter, string> = {
  all: "common.all",
  reflection: "journal.filter.reflections",
  prayer: "journal.filter.prayers",
  question: "journal.filter.questions",
};

/** The search shows once there are more entries than this. */
const SEARCH_ABOVE = 5;

export function JournalFeed({
  items,
  onOpen,
  onRemove,
  sourceLabel,
  onSearchLocked,
  notebooks = [],
  notebook: chosenBook,
  onNotebook,
  railShown = false,
}: {
  items: JournalItem[];
  onOpen: (item: JournalItem) => void;
  onRemove: (item: JournalItem) => void;
  sourceLabel: (source: JournalSource) => string;
  /**
   * Searching the journal is Plus's (1.9, docs/1.9-build/JOURNAL.md). Given,
   * the field stands at rest with the Plus mark and this opens the upgrade
   * sheet named for the journal: shown, never hidden.
   */
  onSearchLocked?: () => void;
  /** Plus: the notebooks the pages name, each a chip that shows its pages. */
  notebooks?: readonly string[];
  /** The notebook shown, when the journal holds it (a computer's side column chooses it too). */
  notebook?: string | null;
  onNotebook?: (notebook: string | null) => void;
  /** On a computer the notebooks are at the side: the chips leave them to it. */
  railShown?: boolean;
}) {
  const { t, locale } = useTranslate();
  const [chosen, setChosen] = useState<JournalFilter>("all");
  const [ownBook, setOwnBook] = useState<string | null>(null);
  const book = onNotebook ? (chosenBook ?? null) : ownBook;
  const setBook = onNotebook ?? setOwnBook;
  const [query, setQuery] = useState("");
  const chips = useMemo(() => journalChips(items), [items]);
  const filter = chips.includes(chosen) ? chosen : "all";

  // Each entry as a page (lib/journal/page.ts): its title, and its words with
  // its verse cards named, for the list and its search. A verse's note is its
  // words alone.
  const verseLabel = useVerseCardLabel();
  // The list shows the writer's own words; a verse card is named in the small
  // line under them, so a reference never reads as the writer's words.
  const pages = useMemo(() => {
    const out = new Map<string, { title: string; text: string; cards: string[]; all: string; notebook?: string; sans?: boolean }>();
    for (const i of items) {
      if (!i.record) {
        out.set(i.key, { title: "", text: i.body, cards: [], all: i.body });
        continue;
      }
      const page = parsePage(i.body);
      const words = pageText({ ...page, blocks: page.blocks.filter((b) => b.type !== "verse") }, verseLabel);
      const cards = page.blocks.flatMap((b) => (b.type === "verse" ? [verseLabel(b)] : []));
      const all = [pageText(page, verseLabel), page.notebook, ...(page.tags ?? [])].filter(Boolean).join("\n");
      out.set(i.key, { title: page.title, text: words, cards, all, notebook: page.notebook, sans: page.style?.font === "sans" });
    }
    return out;
    // verseLabel is remade each render; the book names behind it follow t.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, t]);

  const notebook = book && notebooks.includes(book) ? book : null;
  const shown = useMemo(() => {
    const kind = filterKind(items, filter).filter((i) => !notebook || pages.get(i.key)?.notebook === notebook);
    if (!query.trim()) return kind;
    return kind.filter((i) => {
      const p = pages.get(i.key);
      return matchesQuery([p?.title, p?.all ?? i.body, i.prompt?.text, i.source ? sourceLabel(i.source) : null].filter(Boolean).join(" "), query);
    });
  }, [items, filter, query, sourceLabel, pages, notebook]);

  const groups = useMemo(() => byDay(shown), [shown]);
  // Today and yesterday by the reader's own calendar, read once: noon of the
  // day before, so a day with a clock change still has a yesterday.
  const [now] = useState(() => new Date());
  const today = localDayKey(now.toISOString());
  const yesterday = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).toISOString());

  const [style] = useCalendarStyleDefault();
  // Each past day's line: its date, then what the Church keeps on it.
  const lines = useMemo(() => {
    const out = new Map<string, string>();
    for (const g of groups) {
      const date = g.day === today ? null : dayFromKey(g.day);
      if (!date) continue;
      let when = "";
      try {
        when = new Intl.DateTimeFormat(dateLocale(locale), {
          month: "long",
          day: "numeric",
          ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
        }).format(date);
      } catch {
        when = g.day;
      }
      const church = churchDayLine(date, style);
      const fast = church.fast ? t(`calendar.fast.${church.fast.ruleId}.label`) : null;
      out.set(g.day, [when, church.headline, fast].filter(Boolean).join(" · "));
    }
    return out;
  }, [groups, today, locale, now, style, t]);

  const weekdayOf = (day: string) => {
    const date = dayFromKey(day);
    if (!date) return day;
    try {
      return new Intl.DateTimeFormat(dateLocale(locale), { weekday: "long" }).format(date);
    } catch {
      return day;
    }
  };

  const dayName = (day: string, relative = true) => {
    if (day === "undated") return t("journal.undated");
    if (relative && (day === today || day === yesterday)) {
      try {
        const word = new Intl.RelativeTimeFormat(dateLocale(locale), { numeric: "auto" }).format(day === today ? 0 : -1, "day");
        return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
      } catch {
        /* the date, below */
      }
    }
    const [y, m, d] = day.split("-").map(Number);
    const thisYear = y === now.getFullYear();
    try {
      return new Intl.DateTimeFormat(dateLocale(locale), { weekday: "long", month: "long", day: "numeric", ...(thisYear ? {} : { year: "numeric" }) }).format(new Date(y, m - 1, d));
    } catch {
      return day;
    }
  };
  const timeOf = (iso: string | null) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString(dateLocale(locale), { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    // data-print-part: what Print or save as PDF prints (1.9, lib/ui/printPart.ts).
    <div data-print-part="">
      <p role="heading" aria-level={1} className="hidden font-heading text-title font-bold print:block">
        {t("journal.title")}
      </p>
      {chips.length > 1 || notebooks.length > 0 ? (
        <div data-print-hide="">
          <ChipScroller label={t("journal.filtersLabel")} className="mt-6" gap="gap-2">
            {chips.map((c) => (
              <FilterChip
                key={c}
                active={filter === c && (c !== "all" || !notebook)}
                onClick={() => {
                  setChosen(c);
                  if (c === "all") setBook(null);
                }}
              >
                {t(FILTER_KEY[c])}
              </FilterChip>
            ))}
            {/* Plus: a notebook is a chip that shows its pages; on a computer
                they are at the side instead (JournalClient's NotebookRail). */}
            <span className={railShown ? "contents md:hidden native-md-contents" : "contents"}>
              {notebooks.map((n) => (
                <FilterChip key={`nb-${n}`} active={notebook === n} onClick={() => setBook(notebook === n ? null : n)}>
                  <span className="inline-flex items-center gap-1.5">
                    <ClosedBook size={14} />
                    {n}
                  </span>
                </FilterChip>
              ))}
            </span>
          </ChipScroller>
        </div>
      ) : null}

      {items.length > SEARCH_ABOVE ? (
        // The journal filters itself in place, in the app's one field (1.8, r3-12).
        <div data-print-hide="">
          {onSearchLocked ? (
            <button
              type="button"
              onClick={onSearchLocked}
              data-journal-search="locked"
              className="search-field search-door tap-press mt-5 flex h-[48px] w-full min-w-0 items-center gap-2.5 rounded-pill ps-[15px] pe-3 text-start"
            >
              <Search size={19} className="search-glass shrink-0" />
              <span className="min-w-0 flex-1 truncate font-sans text-[16px] text-paper/45">{t("journal.search")}</span>
              <PlusMark className="shrink-0" />
            </button>
          ) : (
            <SearchField value={query} onChange={setQuery} placeholder={t("journal.search")} className="mt-5" />
          )}
        </div>
      ) : null}

      {groups.map((g) => (
        <section key={g.day} aria-labelledby={`journal-day-${g.day}`} className="mt-8">
          {/* A heading by role, the day's name in Lora (every h1 to h6 is, globals.css). */}
          <p id={`journal-day-${g.day}`} role="heading" aria-level={2} data-journal-day="" className="font-serif text-[20px] font-semibold leading-[1.25] text-paper">
            {g.day === "undated" ? dayName(g.day) : g.day === today || g.day === yesterday ? dayName(g.day) : weekdayOf(g.day)}
            {/* On paper "Today" means nothing a week later: the date beside it (1.9). */}
            {g.day === today ? <span className="hidden print:inline">{`, ${dayName(g.day, false)}`}</span> : null}
          </p>
          {lines.get(g.day) ? (
            <p data-journal-day-line="" className="mt-1 font-sans text-caption leading-[1.45] text-paper/70">
              {lines.get(g.day)}
            </p>
          ) : null}
          <ul className="mt-1 divide-y divide-paper/8 border-b border-paper/8">
            {g.items.map((item) => (
              <SwipeRow key={item.key} onRemove={() => onRemove(item)} removeLabel={t("common.remove")}>
                <button type="button" onClick={() => onOpen(item)} data-journal-entry="" className="block w-full py-4 pe-1 text-start active:opacity-80">
                  {item.prompt ? <span className="block font-sans text-caption text-paper/55">{item.prompt.text}</span> : null}
                  {pages.get(item.key)?.title ? (
                    <span
                      data-journal-entry-title=""
                      className={`block ${pages.get(item.key)?.sans ? "font-sans" : "font-serif"} text-[19px] font-semibold leading-[1.3] text-paper${item.prompt ? " mt-1" : ""}`}
                    >
                      {pages.get(item.key)?.title}
                    </span>
                  ) : null}
                  {pages.get(item.key)?.text ? (
                    <span
                      className={`block whitespace-pre-line line-clamp-4 ${pages.get(item.key)?.sans ? "font-sans" : "font-serif"} text-body leading-[1.6] text-paper/90 print:line-clamp-none${item.prompt || pages.get(item.key)?.title ? " mt-1" : ""}`}
                    >
                      {pages.get(item.key)?.text}
                    </span>
                  ) : null}
                  <span className="mt-1.5 block truncate font-sans text-caption text-paper/50">
                    {[t(KIND_KEY[item.kind]), pages.get(item.key)?.notebook ?? null, item.source ? sourceLabel(item.source) : null, ...(pages.get(item.key)?.cards.slice(0, 2) ?? []), timeOf(item.at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              </SwipeRow>
            ))}
          </ul>
        </section>
      ))}

      {shown.length === 0 && items.length > 0 ? <p className="mt-8 font-sans text-ui text-paper/60">{t("journal.noMatch")}</p> : null}
    </div>
  );
}
