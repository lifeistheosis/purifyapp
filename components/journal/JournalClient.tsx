"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlusGate } from "@/components/florilegium/PlusGate";
import { CARD, CARD_BG } from "@/components/ui/Graphite";
import { Search } from "@/components/ui/icons/Search";
import { byMonth, fromThisDay, useJournal, type JournalEntry } from "@/lib/bible/journal";
import { cn } from "@/lib/cn";
import { getClientEntitlements } from "@/lib/entitlements/client";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";

/**
 * The journal page's body (lib/bible/journal.ts): a Purify Plus tool, so the
 * entitlement is read at runtime, the FlorilegiumGate way, and the loading
 * state errs open. Without Plus the reader meets the upgrade card and their
 * notes stay exactly where they wrote them, free.
 */
export function JournalClient() {
  const [entitled, setEntitled] = useState(true);
  useEffect(() => {
    let alive = true;
    const resolve = () =>
      getClientEntitlements().then((e) => {
        if (alive) setEntitled(e.plusFeatures);
      });
    void resolve();
    const off = onEntitlementsChanged(() => void resolve());
    return () => {
      alive = false;
      off();
    };
  }, []);

  if (!entitled) {
    return <PlusGate titleKey="plus.journal.title" blurbKey="plus.journal.body" modalFeature="journal" />;
  }
  return <Journal />;
}

function Journal() {
  const { t, locale } = useTranslate();
  const entries = useJournal();
  const [query, setQuery] = useState("");
  const [now] = useState(() => new Date());

  const label = (e: JournalEntry) => `${t(`bible.books.${e.book}`)} ${e.chapter}:${e.verse}`;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.note.toLowerCase().includes(q) || `${t(`bible.books.${e.book}`)} ${e.chapter}:${e.verse}`.toLowerCase().includes(q),
    );
  }, [entries, query, t]);
  const remembered = useMemo(() => fromThisDay(entries, now), [entries, now]);

  const monthName = (key: string) =>
    key === "undated"
      ? t("journal.undated")
      : new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-15T12:00:00Z`));
  const dayOf = (iso: string) => new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" }).format(new Date(iso));

  if (entries.length === 0) {
    return (
      <div className={cn(CARD, "mt-12 hover:translate-y-0 md:p-10")} style={CARD_BG}>
        <h2 className="text-title-sm text-paper">{t("journal.emptyTitle")}</h2>
        <p className="mt-3 max-w-[56ch] font-sans text-ui leading-[1.6] text-paper/70">{t("journal.emptyBody")}</p>
        <Link
          href="/bible"
          className="mt-6 inline-flex min-h-11 items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          {t("journal.openTheBible")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10">
      {remembered.length > 0 && !query ? (
        <section aria-labelledby="journal-remembered" className={cn(CARD, "hover:translate-y-0 md:p-8")} style={CARD_BG}>
          <h2 id="journal-remembered" className="text-title-sm text-paper">
            {t("journal.fromThisDay")}
          </h2>
          <ul className="mt-4 space-y-4">
            {remembered.map((e) => (
              <li key={`r-${e.book}-${e.chapter}-${e.verse}`}>
                <Entry entry={e} label={label(e)} when={e.at ? dayOf(e.at) : null} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {entries.length > 5 ? (
        <label className="relative mt-8 flex min-h-12 items-center">
          <span className="sr-only">{t("journal.search")}</span>
          <Search size={17} className="pointer-events-none absolute left-4 text-paper/45" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("journal.search")}
            className="h-12 w-full rounded-pill border border-paper/12 bg-paper/[0.04] pl-11 pr-4 font-sans text-ui text-paper placeholder:text-paper/40 focus:border-paper/30 focus:outline-none"
          />
        </label>
      ) : null}

      {byMonth(shown).map((group) => (
        <section key={group.key} aria-labelledby={`journal-${group.key}`} className="mt-10">
          <h2 id={`journal-${group.key}`} className="text-title-sm text-paper">
            {monthName(group.key)}
          </h2>
          <ul className="mt-4 divide-y divide-paper/8 border-y border-paper/8">
            {group.entries.map((e) => (
              <li key={`${e.book}-${e.chapter}-${e.verse}`} className="py-4">
                <Entry entry={e} label={label(e)} when={e.at ? dayOf(e.at) : null} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {shown.length === 0 ? <p className="mt-8 font-sans text-ui text-paper/60">{t("journal.noMatch")}</p> : null}
    </div>
  );
}

function Entry({ entry, label, when }: { entry: JournalEntry; label: string; when: string | null }) {
  return (
    <Link href={`/bible/${entry.book}/${entry.chapter}#v${entry.verse}`} className="group block">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-sans text-detail font-semibold text-premium-ink group-hover:text-premium-bright">{label}</span>
        {when ? <span className="font-sans text-caption text-paper/45">{when}</span> : null}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap font-serif text-body leading-[1.6] text-paper/85">{entry.note}</p>
    </Link>
  );
}
