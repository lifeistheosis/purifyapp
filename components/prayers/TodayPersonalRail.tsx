"use client";

// The personal rail of the Today page. Everything is drawn from the device,
// no account required: the Bible chapter you were reading
// (purify:bible:last), your place on the History timeline, the prayers you
// opened recently, and your saved items. Sections that have nothing to say
// render nothing; a reader's first visit shows a single quiet hint instead
// of a wall of empty boxes.
//
// The eyebrows here used to be six hardcoded English strings passed as
// props. They passed both gates by accident: react/jsx-no-literals runs with
// ignoreProps, and scripts/i18n-check.mjs only scans a fixed list of prop
// names. They were English in all 21 locales.

import Link from "next/link";
import { useEffect, useState } from "react";

import { readLastRead, type LastRead } from "@/lib/bible/lastRead";
import { eventBySlug } from "@/lib/history/events";
import { loadPosition } from "@/lib/history/scroll";
import { readRecentPrayers, type RecentPrayer } from "@/lib/prayers/storage";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useBookmarks } from "@/lib/bookmarks";
import { TodayHeading } from "@/components/prayers/TodayHeading";

const FOCUS =
  "rounded-sm focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4";

/**
 * A hairline row, not a card. The page already has exactly one filled
 * surface (the act band) and one art panel (the verse); a stack of four more
 * bordered boxes in the second column was what made the old layout read as a
 * dashboard.
 */
function RailRow({
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
      className={`press-card group -mx-2 block px-2 py-2.5 transition-colors duration-200 hover:bg-paper/[0.04] ${FOCUS}`}
    >
      <span className="block font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-paper/60">
        {eyebrow}
      </span>
      <span className="mt-0.5 block truncate font-display-serif text-lede text-paper leading-tight transition-colors duration-200 group-hover:text-gold">
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
  const { t, tn } = useTranslate();
  const [mounted, setMounted] = useState(false);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  const [historyEvent, setHistoryEvent] = useState<{
    title: string;
    date: string;
  } | null>(null);
  const [recents, setRecents] = useState<RecentPrayer[]>([]);
  const { bookmarks } = useBookmarks();

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate (Sheet.tsx precedent): every source here is localStorage. */
  useEffect(() => {
    try {
      setLastRead(readLastRead());
      const pos = loadPosition();
      const ev = pos ? eventBySlug(pos.anchorSlug) : undefined;
      if (ev)
        setHistoryEvent({
          title: ev.shortTitle ?? ev.title,
          date: ev.displayDate,
        });
      // Two, not three: four rows is the most this column can hold beside
      // the day without running past it.
      setRecents(readRecentPrayers().slice(0, 2));
    } catch {
      /* a broken pointer never breaks Today */
    }
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const bookCap = lastRead
    ? lastRead.bookName.charAt(0).toUpperCase() + lastRead.bookName.slice(1)
    : "";
  const readHref = lastRead
    ? lastRead.verse > 1
      ? `/bible/${lastRead.book}/${lastRead.chapter}#v${lastRead.verse}`
      : `/bible/${lastRead.book}/${lastRead.chapter}`
    : "";

  const hasAnything =
    Boolean(lastRead) ||
    Boolean(historyEvent) ||
    recents.length > 0 ||
    bookmarks.length > 0;

  // The heading renders in the first frame, outside the mount gate, so the
  // column has a shape before localStorage is readable.
  return (
    <section aria-labelledby="today-leftoff">
      <TodayHeading id="today-leftoff" tone="gold">
        {t("prayers.today.whereYouLeftOff")}
      </TodayHeading>

      {!mounted ? (
        <div aria-hidden className="h-0" />
      ) : hasAnything ? (
        <div className="mt-3 divide-y divide-paper/10">
          {lastRead ? (
            <div className="py-1 first:pt-0 last:pb-0">
              <RailRow
                eyebrow={t("prayers.today.continueReading")}
                title={`${bookCap} ${lastRead.chapter}`}
                sub={
                  lastRead.verse > 1
                    ? t("prayers.today.atVerse", { verse: lastRead.verse })
                    : undefined
                }
                href={readHref}
              />
            </div>
          ) : null}
          {historyEvent ? (
            <div className="py-1 first:pt-0 last:pb-0">
              <RailRow
                eyebrow={t("prayers.today.continueInHistory")}
                title={historyEvent.title}
                sub={historyEvent.date}
                href="/history"
              />
            </div>
          ) : null}
          {recents.map((r) => (
            <div key={r.id} className="py-1 first:pt-0 last:pb-0">
              <RailRow
                eyebrow={t("prayers.today.recentPrayer")}
                title={r.title}
                href={r.href}
              />
            </div>
          ))}
          {bookmarks.length > 0 ? (
            <div className="py-1 first:pt-0 last:pb-0">
              <RailRow
                eyebrow={t("prayers.today.savedEyebrow")}
                title={tn("prayers.today.savedItems", bookmarks.length)}
                href="/saved"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 font-serif italic text-detail text-paper/60 leading-[1.6]">
          {t("prayers.today.railEmpty")}
        </p>
      )}
    </section>
  );
}
