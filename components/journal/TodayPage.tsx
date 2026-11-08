"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { Pen } from "@/components/ui/icons/Pen";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { localBookNames } from "@/lib/bible/books";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { READING_KIND_KEY, verseSpan } from "@/lib/journal/churchDay";
import type { JournalSource } from "@/lib/journal/entries";
import { localDayKey } from "@/lib/journal/feed";
import { highlightFrom } from "@/lib/saved/feed";
import { useVerseWords } from "@/lib/saved/verseWords";

type Highlighted = { book: string; chapter: number; verse: number };

/** The verses highlighted on this device today, newest first. */
function highlightedToday(today: Date): Highlighted[] {
  const day = localDayKey(today.toISOString());
  const out: { h: Highlighted; at: string }[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("purify:bible:")) continue;
      const h = highlightFrom(key, window.localStorage.getItem(key));
      if (h?.at && localDayKey(h.at) === day) out.push({ h: { book: h.book, chapter: h.chapter, verse: h.verse }, at: h.at });
    }
  } catch {
    return [];
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3).map((x) => x.h);
}

/**
 * Today's page (1.9, docs/1.9-build/JOURNAL.md): the top of the journal is
 * the day itself, a diary's page for the Church's day. The weekday large in
 * Lora, the date and the day's feast or saints under it, and its fast when it
 * keeps one (lib/calendar/useChurchDay.ts, as Today names them); Write; and
 * the day to write from: today's readings and the verses highlighted today,
 * each with a pen that begins a page about it.
 *
 * The owner's word of 2026-11-08: "the whole journaling system should feel
 * like a journaling system, not just a notepad system".
 */
export function TodayPage({ onWrite, onWriteFrom }: { onWrite: () => void; onWriteFrom: (source: JournalSource) => void }) {
  const { t, locale } = useTranslate();
  const day = useChurchDay();
  const books = useMemo(() => localBookNames(t), [t]);
  const bookName = (slug: string) => books[slug] ?? t(`bible.books.${slug}`);
  const [highlights, setHighlights] = useState<Highlighted[]>([]);
  const todayKey = day ? localDayKey(day.today.toISOString()) : null;
  useEffect(() => {
    if (!day) return;
    // The device's own highlights, read after the page has painted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlights(highlightedToday(day.today));
    // todayKey is the day; day changes object on every render of its hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  if (!day) return <div className="mt-6 min-h-[200px]" aria-hidden />;

  const fmt = (o: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(dateLocale(locale), o).format(day.today);
    } catch {
      return "";
    }
  };
  const weekday = fmt({ weekday: "long" });
  const date = fmt({ month: "long", day: "numeric" });
  const fasting = day.fast.kind === "strict" || day.fast.kind === "wine-oil" || day.fast.kind === "fish" || day.fast.kind === "fast";
  const line = [date, day.headline?.name, fasting ? t(`calendar.fast.${day.fast.ruleId}.label`) : null].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="journal-today" data-journal-today="" className="mt-6 rounded-[28px] border border-paper/10 bg-night-soft px-5 pb-3 pt-5">
      <p id="journal-today" role="heading" aria-level={2} className="font-serif text-[32px] font-semibold leading-[1.1] text-paper">
        {weekday}
      </p>
      <p className="mt-1.5 font-sans text-caption leading-[1.45] text-paper/70">{line}</p>
      <button
        type="button"
        onClick={onWrite}
        className="tap-press mt-4 inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night"
      >
        <Pen size={18} />
        {t("journal.write")}
      </button>

      {day.readings.length > 0 ? (
        <>
          <p className="mt-5 font-sans text-caption font-semibold text-paper/70">{t("calendar.todaysReadings")}</p>
          <ul className="mt-1">
            {day.readings.map((r, i) => {
              const label = `${t(READING_KIND_KEY[r.kind])} · ${bookName(r.book)} ${r.chapter}:${verseSpan(r.from, r.to)}`;
              return (
                <li key={`${r.book}-${r.chapter}-${r.from}`}>
                  <DayRow
                    first={i === 0}
                    icon={<Book size={20} />}
                    label={label}
                    onClick={() => onWriteFrom({ type: "reading", kind: r.kind, book: r.book, chapter: r.chapter, from: r.from, to: r.to, label })}
                  />
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {highlights.length > 0 ? (
        <ul className={day.readings.length > 0 ? "" : "mt-4"}>
          {highlights.map((h, i) => (
            <li key={`${h.book}-${h.chapter}-${h.verse}`}>
              <HighlightRow
                first={day.readings.length === 0 && i === 0}
                label={`${t("saved.kind.highlight")} · ${bookName(h.book)} ${h.chapter}:${h.verse}`}
                verse={h}
                onWrite={(label) => onWriteFrom({ type: "verse", book: h.book, chapter: h.chapter, verse: h.verse, label })}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function HighlightRow({ first, label, verse, onWrite }: { first: boolean; label: string; verse: Highlighted; onWrite: (label: string) => void }) {
  const words = useVerseWords(verse.book, verse.chapter, verse.verse, true);
  return <DayRow first={first} icon={<Sparkle size={20} />} label={label} quote={words.text ?? undefined} onClick={() => onWrite(label.split(" · ").pop() ?? label)} />;
}

/** One thing of the day to write from: its mark, its name, its words if it has them, and the pen. */
function DayRow({ first, icon, label, quote, onClick }: { first: boolean; icon: ReactNode; label: string; quote?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "tap-press flex min-h-[54px] w-full items-center gap-3 py-2 text-start" + (first ? "" : " border-t border-paper/10")
      }
    >
      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-paper/[0.08] text-paper/95">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-[15px] font-semibold text-paper/95">{label}</span>
        {quote ? <span className="mt-0.5 line-clamp-2 block font-serif text-[14px] italic leading-[1.5] text-paper/75">{quote}</span> : null}
      </span>
      <span className="shrink-0 text-paper/70">
        <Pen size={18} />
      </span>
    </button>
  );
}
