"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useVerseCardLabel } from "@/components/journal/PageBlocks";
import { Pen } from "@/components/ui/icons/Pen";
import { Plus } from "@/components/ui/icons/Plus";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { useJournalRecords } from "@/lib/journal/entries";
import { askJournalPage, writeInGathering } from "@/lib/journal/gatheringActions";
import { pagesIn } from "@/lib/journal/gatherings";

import { FLOR_FACT, FLOR_H2, FLOR_PLATE, FLOR_ROW, FLOR_TRAY } from "./florStyle";

/**
 * A gathering's journal pages, under its lines (1.9, build 93 note 19, the
 * owner on 2026-11-11: "I want the Florigelium and the notebook system like
 * intertwined").
 *
 * A gathering's notebook is the journal's notebook that bears its name
 * (lib/journal/gatherings.ts): the pages a reader has written there are
 * listed here, newest first, each a row that opens it in the journal, and the
 * last row begins a new one in this gathering. Drawn as the Florilegium's
 * first page draws the reader's gatherings: a part's name in Lora, one raised
 * tray, a row for each and the thing to do as its last row
 * (FlorilegiaHub.tsx).
 *
 * `readOnly`, a reader whose Plus has lapsed: the pages they wrote are theirs
 * to open, and nothing new is begun here; with no pages there is nothing to
 * show. Not in the booklet, which is the gathering's lines.
 */
export function GatheringPages({ title, readOnly = false }: { title: string; readOnly?: boolean }) {
  const { t, locale } = useTranslate();
  const router = useRouter();
  const records = useJournalRecords();
  const verseLabel = useVerseCardLabel();
  const pages = useMemo(() => pagesIn(title, records, verseLabel), [title, records, verseLabel]);
  if (readOnly && pages.length === 0) return null;

  const day = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(dateLocale(locale), { month: "short", day: "numeric" }).format(new Date(iso));
    } catch {
      return "";
    }
  };
  /** A page's words on one line, as its row shows them. */
  const line = (words: string) => words.replace(/\s+/g, " ").trim();

  return (
    <section aria-labelledby="gathering-pages" data-gathering-pages="" data-print-hide="" className="mt-9">
      <h2 id="gathering-pages" className={FLOR_H2}>
        {t("study.florilegium.pages")}
      </h2>
      <ul className={cn(FLOR_TRAY, "mt-2.5")}>
        {pages.map((p) => (
          <li key={p.id} className="theology-rule">
            <button
              type="button"
              data-gathering-page-row={p.id}
              onClick={() => {
                askJournalPage(p.id);
                router.push("/journal/");
              }}
              className={FLOR_ROW}
            >
              <span aria-hidden className={FLOR_PLATE}>
                <Pen size={18} />
              </span>
              <span className="min-w-0 flex-1">
                {/* The writer's own words, read their own way and rightly cut to one line in a list. */}
                <span
                  dir="auto"
                  data-mock-allow="cut"
                  data-mock-why="a reader's own title or words, cut to one line in a list of their pages"
                  className="block truncate font-serif text-[15.5px] font-semibold leading-tight text-paper/92"
                >
                  {p.title || line(p.words)}
                </span>
                {p.title && p.words ? (
                  <span dir="auto" className="mt-0.5 block truncate font-serif text-caption text-paper/60">
                    {line(p.words)}
                  </span>
                ) : null}
              </span>
              <span className={FLOR_FACT}>{day(p.at)}</span>
            </button>
          </li>
        ))}
        {readOnly ? null : (
          <li className="theology-rule">
            <button
              type="button"
              data-gathering-write=""
              onClick={() => {
                if (writeInGathering(title, null)) router.push("/journal/");
              }}
              className={FLOR_ROW}
            >
              <span aria-hidden className={FLOR_PLATE}>
                <Plus size={18} />
              </span>
              <span className="min-w-0 flex-1 font-sans text-ui font-semibold leading-snug text-paper">{t("study.florilegium.writeHere")}</span>
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
