"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import type { ReadingRef } from "@/lib/calendar/orthodox";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { fastView } from "@/lib/onboarding/space";
import { useSpace } from "@/lib/onboarding/useSpace";

/**
 * The day, at the top of the search before anything is typed (1.7): the
 * day's saint, its readings and the fast, each a row that opens it. The
 * owner, 2026-10-16: "Today's search could look better". It opened on the
 * same eight rows for everyone, every day.
 *
 * Its own file, loaded by the search only once it is open with nothing typed
 * (CommandPalette, loadSearchToday): the search is mounted on every screen,
 * and the Church's calendar behind these rows must not be carried by each
 * one of them. The rows are the ones Today's "The Church today" list opens,
 * worked out the same way (lib/calendar/useChurchDay), so the two agree.
 */
export function SearchToday({ onGo }: { onGo: (href: string) => void }) {
  const day = useChurchDay();
  const { fasting } = useSpace();
  const { t } = useTranslate();
  // The frame before the device's day is known draws nothing rather than a
  // day that may be the wrong one.
  if (!day) return null;

  const rows: { id: string; href: string; label: string; sublabel: string }[] = [];
  const saint = day.headlineSaint;
  if (saint) {
    rows.push({ id: "saint", href: `/saints/${saint.slug}`, label: saint.name, sublabel: t("today.saintEyebrow") });
  } else if (day.headline) {
    rows.push({ id: "saint", href: "/calendar", label: day.headline.name, sublabel: t("today.saintEyebrow") });
  }
  const books = localBookNames(t);
  const kind = (r: ReadingRef) =>
    r.kind === "epistle" ? t("bible.kindEpistleLong") : r.kind === "ot" ? t("bible.kindOtLong") : t("bible.kindGospelLong");
  day.readings.forEach((r, i) => {
    rows.push({ id: `reading-${i}`, href: `/bible/${r.book}/${r.chapter}#v${r.from}`, label: referenceIn(r.label, r.book, books), sublabel: kind(r) });
  });
  if (fasting !== "hidden") {
    const plain = fastView(day.fast.kind, fasting)?.mode === "plain";
    rows.push({
      id: "fast",
      href: "/fasting",
      label: plain ? t("today.fastPlain.label") : t(`calendar.fast.${day.fast.ruleId}.label`),
      sublabel: t("today.fastEyebrow"),
    });
  }
  if (!rows.length) return null;

  return (
    <div className="mb-1" data-search-today="">
      <p className="px-4 pb-1 pt-3 font-sans text-caption text-paper/35">{t("nav.today")}</p>
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onGo(row.href)}
          className="flex min-h-[52px] w-full flex-col justify-center gap-0.5 px-4 py-2 text-left transition-colors hover:bg-paper/5"
        >
          <span className="truncate font-sans text-ui text-paper/85">{row.label}</span>
          <span className="truncate font-sans text-caption text-paper/50">{row.sublabel}</span>
        </button>
      ))}
    </div>
  );
}
