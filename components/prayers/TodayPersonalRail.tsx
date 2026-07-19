"use client";

// t("prayers.today.whereYouLeftOff"): the personal rail of the Today page. Everything is
// drawn from the device, no account required: the Bible chapter you were
// reading (purify:bible:last), your place on the History timeline, the
// prayers you opened recently, and your saved items. Sections that have
// nothing to say render nothing; a reader's first visit shows a single
// quiet hint instead of a wall of empty boxes.

import Link from "next/link";
import { useEffect, useState } from "react";

import { readLastRead, type LastRead } from "@/lib/bible/lastRead";
import { eventBySlug } from "@/lib/history/events";
import { loadPosition } from "@/lib/history/scroll";
import { readRecentPrayers, type RecentPrayer } from "@/lib/prayers/storage";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useBookmarks } from "@/lib/bookmarks";

function RailCard({
  eyebrow,
  title,
  sub,
  href,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-paper/10 bg-night-soft/50 px-4 py-3.5 transition-colors hover:border-gold/45"
    >
      <span className="block font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-paper/55">
        {eyebrow}
      </span>
      <span className="mt-1 block truncate font-display-serif text-lede text-paper leading-tight transition-colors group-hover:text-gold">
        {title}
      </span>
      {sub ? (
        <span className="mt-0.5 block truncate font-serif italic text-caption text-paper/60">
          {sub}
        </span>
      ) : null}
    </Link>
  );
}

export function TodayPersonalRail() {
  const { t } = useTranslate();
  const [mounted, setMounted] = useState(false);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  const [historyEvent, setHistoryEvent] = useState<{ title: string; date: string } | null>(null);
  const [recents, setRecents] = useState<RecentPrayer[]>([]);
  const { bookmarks } = useBookmarks();

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate (Sheet.tsx precedent): every source here is localStorage. */
  useEffect(() => {
    try {
      setLastRead(readLastRead());
      const pos = loadPosition();
      const ev = pos ? eventBySlug(pos.anchorSlug) : undefined;
      if (ev) setHistoryEvent({ title: ev.shortTitle ?? ev.title, date: ev.displayDate });
      setRecents(readRecentPrayers().slice(0, 3));
    } catch {
      /* a broken pointer never breaks Today */
    }
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!mounted) return null;

  const bookCap = lastRead
    ? lastRead.bookName.charAt(0).toUpperCase() + lastRead.bookName.slice(1)
    : "";
  const readHref = lastRead
    ? lastRead.verse > 1
      ? `/bible/${lastRead.book}/${lastRead.chapter}#v${lastRead.verse}`
      : `/bible/${lastRead.book}/${lastRead.chapter}`
    : "";

  const hasAnything =
    lastRead || historyEvent || recents.length > 0 || bookmarks.length > 0;

  return (
    <section aria-label={t("prayers.today.whereYouLeftOff")}>
      <p className="mb-3 font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/80">
        {t("prayers.today.whereYouLeftOff")}
      </p>
      {hasAnything ? (
        <div className="space-y-2.5">
          {lastRead ? (
            <RailCard
              eyebrow="Continue reading"
              title={`${bookCap} ${lastRead.chapter}`}
              sub={lastRead.verse > 1 ? `at verse ${lastRead.verse}` : undefined}
              href={readHref}
            />
          ) : null}
          {historyEvent ? (
            <RailCard
              eyebrow="Continue in History"
              title={historyEvent.title}
              sub={historyEvent.date}
              href="/history"
            />
          ) : null}
          {recents.map((r) => (
            <RailCard key={r.id} eyebrow="Recent prayer" title={r.title} href={r.href} />
          ))}
          {bookmarks.length > 0 ? (
            <RailCard
              eyebrow="Saved"
              title={`${bookmarks.length} saved ${bookmarks.length === 1 ? "item" : "items"}`}
              href="/saved"
            />
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-paper/10 bg-night-soft/40 px-4 py-4 font-serif italic text-detail text-paper/55 leading-[1.6]">
          {t("prayers.today.railEmpty")}
        </p>
      )}
    </section>
  );
}
