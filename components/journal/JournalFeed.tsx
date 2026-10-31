"use client";

// The journal's list (1.7, the owner's note 23: "entries by day in one calm
// list (the words first, the date small)").
//
// The day's groups under Today, Yesterday or the weekday and date; in each,
// every entry's words first in Lora, then one small line: what kind it is,
// what it is about, the time. A tap opens it in the writing sheet; a swipe
// takes it away, with Undo. Above the list the kinds to filter by and, once
// there are more than five entries, a search. No gold: the reference that
// used to lead each note in the premium ink now follows the words, small.

import { useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { KIND_KEY } from "@/components/journal/JournalComposer";
import { SearchField } from "@/components/search/SearchField";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { FilterChip } from "@/components/ui/FilterChip";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { dateLocale } from "@/lib/i18n/deviceDates";
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
}: {
  items: JournalItem[];
  onOpen: (item: JournalItem) => void;
  onRemove: (item: JournalItem) => void;
  sourceLabel: (source: JournalSource) => string;
}) {
  const { t, locale } = useTranslate();
  const [chosen, setChosen] = useState<JournalFilter>("all");
  const [query, setQuery] = useState("");
  const chips = useMemo(() => journalChips(items), [items]);
  const filter = chips.includes(chosen) ? chosen : "all";

  const shown = useMemo(() => {
    const kind = filterKind(items, filter);
    if (!query.trim()) return kind;
    return kind.filter((i) => matchesQuery([i.body, i.prompt?.text, i.source ? sourceLabel(i.source) : null].filter(Boolean).join(" "), query));
  }, [items, filter, query, sourceLabel]);

  const groups = useMemo(() => byDay(shown), [shown]);
  // Today and yesterday by the reader's own calendar, read once: noon of the
  // day before, so a day with a clock change still has a yesterday.
  const [now] = useState(() => new Date());
  const today = localDayKey(now.toISOString());
  const yesterday = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).toISOString());

  const dayName = (day: string) => {
    if (day === "undated") return t("journal.undated");
    if (day === today || day === yesterday) {
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
    <div>
      {chips.length > 1 ? (
        <ChipScroller label={t("journal.filtersLabel")} className="mt-6" gap="gap-2">
          {chips.map((c) => (
            <FilterChip key={c} active={filter === c} onClick={() => setChosen(c)}>
              {t(FILTER_KEY[c])}
            </FilterChip>
          ))}
        </ChipScroller>
      ) : null}

      {items.length > SEARCH_ABOVE ? (
        // The journal filters itself in place, in the app's one field (1.8, r3-12).
        <SearchField value={query} onChange={setQuery} placeholder={t("journal.search")} className="mt-5" />
      ) : null}

      {groups.map((g) => (
        <section key={g.day} aria-labelledby={`journal-day-${g.day}`} className="mt-8">
          {/* A heading by role: every h1 to h6 is set in Lora (globals.css). */}
          <p id={`journal-day-${g.day}`} role="heading" aria-level={2} className="font-sans text-caption font-semibold text-paper/55">
            {dayName(g.day)}
          </p>
          <ul className="mt-1 divide-y divide-paper/8 border-b border-paper/8">
            {g.items.map((item) => (
              <SwipeRow key={item.key} onRemove={() => onRemove(item)} removeLabel={t("common.remove")}>
                <button type="button" onClick={() => onOpen(item)} data-journal-entry="" className="block w-full py-4 pe-1 text-start active:opacity-80">
                  {item.prompt ? <span className="block font-sans text-caption text-paper/55">{item.prompt.text}</span> : null}
                  <span className={`block whitespace-pre-line line-clamp-4 font-serif text-body leading-[1.6] text-paper/90${item.prompt ? " mt-1" : ""}`}>
                    {item.body}
                  </span>
                  <span className="mt-1.5 block truncate font-sans text-caption text-paper/50">
                    {[t(KIND_KEY[item.kind]), item.source ? sourceLabel(item.source) : null, timeOf(item.at)].filter(Boolean).join(" · ")}
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
