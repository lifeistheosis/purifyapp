"use client";

// Search over Church history: one matching logic (lib/history/filter's
// searchEvents), two places.
//  - Inline: a field with its results under it, on a tablet's and a
//    computer's timeline.
//  - In a sheet: on a phone, the field at the top of the shared movable
//    sheet (1.7: every pop-up is a movable sheet; this was a full-screen
//    layer of its own). The sheet takes what the keyboard leaves, so the
//    field and the results are never under it.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { publishedEvents, type HistoryEventMeta } from "@/lib/history/events";
import { searchEvents } from "@/lib/history/filter";

function ResultRow({ event, onNavigate }: { event: HistoryEventMeta; onNavigate?: () => void }) {
  return (
    <Link
      href={`/history/${event.slug}`}
      onClick={onNavigate}
      className="tap-press block rounded-[10px] px-3 py-3 hover:bg-paper/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
    >
      <span className="block font-sans text-caption text-paper/55 tabular-nums">{event.displayDate}</span>
      <span className="mt-0.5 block font-sans text-ui font-semibold text-paper/90">{event.title}</span>
      <span className="mt-0.5 block font-sans text-detail leading-[1.5] text-paper/60">{event.preview}</span>
    </Link>
  );
}

function NoMatch({ query }: { query: string }) {
  const { t } = useTranslate();
  return (
    <p className="px-3 py-4 font-sans text-detail text-paper/60">{t("study.history.noMatch", { query })}</p>
  );
}

const FIELD =
  "w-full min-h-11 rounded-pill border border-paper/15 bg-night-soft px-4 font-sans text-ui text-paper placeholder:text-paper/50 focus:border-paper/40 focus:outline-none";

export function HistorySearchInline({
  className,
  id = "history-search-inline",
}: {
  className?: string;
  /** Distinct per instance: the toolbar and the side column can both be in the page. */
  id?: string;
}) {
  const { t } = useTranslate();
  const [q, setQ] = useState("");
  const results = searchEvents(publishedEvents(), q, 8);
  return (
    <div className={className}>
      <label className="sr-only" htmlFor={id}>
        {t("study.history.searchChurchHistory")}
      </label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("study.history.searchChurchHistoryEllipsis")}
        autoComplete="off"
        className={FIELD}
      />
      {q.trim() ? (
        // Height-capped: a long list would otherwise run past the screen.
        <div className="mt-2 max-h-[min(60vh,480px)] overflow-y-auto overscroll-contain rounded-[12px] border border-paper/12 bg-night p-1">
          {results.length ? results.map((e) => <ResultRow key={e.slug} event={e} />) : <NoMatch query={q.trim()} />}
        </div>
      ) : null}
    </div>
  );
}

export function HistorySearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslate();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // The field takes the keyboard once the sheet has risen.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => input.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [open]);

  const results = searchEvents(publishedEvents(), q, 12);
  return (
    <Sheet open={open} onClose={onClose} title={t("study.history.searchChurchHistory")} fill openFull>
      <label className="sr-only" htmlFor="history-search-sheet">
        {t("study.history.searchChurchHistory")}
      </label>
      <input
        ref={input}
        id="history-search-sheet"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("study.history.searchChurchHistoryEllipsis")}
        autoComplete="off"
        enterKeyHint="search"
        className={FIELD}
      />
      <div className="mt-3">
        {q.trim() ? (
          results.length ? (
            results.map((e) => <ResultRow key={e.slug} event={e} onNavigate={onClose} />)
          ) : (
            <NoMatch query={q.trim()} />
          )
        ) : (
          <p className="px-3 py-4 font-sans text-detail text-paper/55">{t("study.searchByNamePlaceYear")}</p>
        )}
      </div>
    </Sheet>
  );
}
