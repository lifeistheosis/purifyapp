"use client";

// "Pray now": the prayers to open this minute. It used to be two
// side-by-side rails, Continue praying and Suggested for today, and a reader
// with one recent prayer, or none, saw a column with one row or nothing
// beside a column of three: the empty space reported on 2026-09-26. Now it
// is always four: the prayer to continue first, if there is one, then what
// fits the hour, the season and the fast.
//
// Desktop lays the four out as one row of cards. A phone gets one card with
// four rows, so the section is a thumb's height and not a page of it.
//
// Resolved on the device (the desktop tree ships into the Android export,
// where a server's "what day is it" is frozen at build time), so it is
// drawn as quiet placeholders until it is.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD, CARD_BG } from "@/components/ui/Graphite";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { cn } from "@/lib/cn";
import { getRuleMeta } from "@/lib/prayers/rules";
import { isFastDay, seasonFor } from "@/lib/prayers/season";
import { useRecentPrayers } from "@/lib/prayers/storage";
import { suggestRules, timeOfDayAt } from "@/lib/prayers/suggest";
import { useMounted } from "@/lib/useMounted";

type Card = { id: string; href: string; title: string; description?: string; minutes?: number; resume: boolean };

const SLOTS = 4;

export function PrayNow({ variant }: { variant: "desktop" | "mobile" }) {
  const { t, tn } = useTranslate();
  const mounted = useMounted();
  const today = useToday();
  const [style] = useCalendarStyleDefault();
  const recents = useRecentPrayers();

  if (!mounted || !today) {
    return variant === "desktop" ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: SLOTS }, (_, i) => (
          <div key={i} className={cn(CARD, "min-h-[168px] opacity-50 hover:translate-y-0")} style={CARD_BG} />
        ))}
      </div>
    ) : (
      <div className={cn(CARD, "gap-4 p-5 hover:translate-y-0 md:p-5")} style={CARD_BG} aria-hidden>
        {Array.from({ length: SLOTS }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" weight="faint" />
        ))}
      </div>
    );
  }

  // A catalog title when the rule has one, else the registry's English: a
  // missing key must never reach the screen as the key itself.
  const text = (id: string, fallback: string, part: "title" | "description") => {
    const key = `prayers.rule.${id}.${part}`;
    const v = t(key);
    return v === key ? fallback : v;
  };

  const cards: Card[] = [];
  const last = recents[0];
  if (last) {
    const meta = getRuleMeta(last.id);
    cards.push({
      id: last.id,
      href: last.href,
      title: meta ? text(meta.id, meta.title, "title") : last.title,
      description: meta?.description ? text(meta.id, meta.description, "description") : undefined,
      minutes: meta?.estimatedMinutes,
      resume: true,
    });
  }
  for (const r of suggestRules({
    tod: timeOfDayAt(new Date()),
    season: seasonFor(today),
    isFast: isFastDay(today, style),
    max: SLOTS - cards.length,
    exclude: new Set(cards.map((c) => c.id)),
  })) {
    cards.push({
      id: r.id,
      href: r.href,
      title: text(r.id, r.title, "title"),
      description: r.description ? text(r.id, r.description, "description") : undefined,
      minutes: r.estimatedMinutes,
      resume: false,
    });
  }

  const chip = (
    <span className="shrink-0 rounded-pill bg-paper/[0.1] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/85">
      {t("common.continue")}
    </span>
  );

  if (variant === "mobile") {
    return (
      <div className={cn(CARD, "p-0 hover:translate-y-0 md:p-0")} style={CARD_BG}>
        <ul className="divide-y divide-paper/10">
          {cards.map((c) => (
            <li key={c.id}>
              <Link
                href={c.href}
                className="flex min-h-[64px] items-center gap-3 px-5 py-3.5 transition-colors active:bg-paper/[0.06]"
              >
                <span className="min-w-0 flex-1">
                  {/* The chip sits over the title, not beside it: beside it,
                      a title as long as Prayers before Communion was cut to
                      three words at phone width. */}
                  {c.resume ? <span className="mb-1.5 flex">{chip}</span> : null}
                  <span className="block font-heading text-ui font-semibold leading-snug text-paper">{c.title}</span>
                  {c.description ? (
                    <span className="mt-0.5 block truncate font-sans text-caption text-paper/55">{c.description}</span>
                  ) : null}
                </span>
                {c.minutes ? (
                  <span className="shrink-0 font-sans text-caption tabular-nums text-paper/50">
                    {tn("prayers.approxMin", c.minutes)}
                  </span>
                ) : null}
                <span aria-hidden className="shrink-0 font-sans text-ui text-paper/35">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <li key={c.id} className="flex">
          <Link href={c.href} className={cn(CARD, "min-h-[168px] w-full p-6 md:p-6")} style={CARD_BG}>
            <div className="flex min-h-6 items-center justify-between gap-3">
              {c.resume ? chip : <span />}
              {c.minutes ? (
                <span className="font-sans text-caption tabular-nums text-paper/55">
                  {tn("prayers.approxMin", c.minutes)}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-lede font-bold leading-tight text-paper md:text-title-sm">{c.title}</h3>
            {c.description ? (
              <p className="mt-2 line-clamp-2 font-sans text-detail leading-[1.5] text-paper/65">{c.description}</p>
            ) : null}
            <span
              aria-hidden
              className="mt-auto self-end pt-4 font-sans text-lede text-paper/45 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-paper motion-reduce:transition-none"
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
