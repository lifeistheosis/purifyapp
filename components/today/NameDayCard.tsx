"use client";

// Your name day on Today (1.8, the owner's yes of 2026-10-24). Community and
// the morning email already mark it; on the day itself Today greets the
// reader too: their patron's icon, name and, where the app has a line of
// theirs it can show where it stands, their own words (lib/today/saintWords.ts).
// Nothing at all on every other day, and nothing signed out.
//
// The patron is the one the widget asks for (/api/profile/patron-saint) and
// the day is worked out the way the widget works it out, on the reader's own
// calendar (lib/widget/state.ts, patronFacts). The answer is kept for the
// day on the device, so Today asks the website once a day, not on every open.
// A patron saved in the app (lib/profile/patronEvent.ts) replaces it at once:
// the kept answer is forgotten, and a card on the screen takes the saved one.

import Link from "next/link";
import { useEffect, useState } from "react";

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import profiledSaints from "@/data/calendar/profiled-saints.json";
import { apiFetch } from "@/lib/api/client";
import { readCalendarStyleDefault } from "@/lib/calendar/styleDefault";
import { cn } from "@/lib/cn";
import { useMyPicture } from "@/lib/profile/myPicture";
import { PATRON_EVENT, TODAY_PATRON_KEY, type PatronChange } from "@/lib/profile/patronEvent";
import { todayKey } from "@/lib/rhythm/dayKey";
import type { SaintBrief } from "@/lib/saints/brief";
import { saintWordsFor } from "@/lib/today/saintWords";

type Kept = { day: string; who: string; slug: string | null };

function readKept(day: string, who: string): Kept | null {
  try {
    const kept = JSON.parse(window.localStorage.getItem(TODAY_PATRON_KEY) ?? "null") as Kept | null;
    return kept && kept.day === day && kept.who === who ? kept : null;
  } catch {
    return null;
  }
}

function keep(kept: Kept): void {
  try {
    window.localStorage.setItem(TODAY_PATRON_KEY, JSON.stringify(kept));
  } catch {
    /* private mode: Today asks again next time */
  }
}

export function NameDayCard({ className }: { className?: string }) {
  const { t } = useTranslate();
  const me = useMyPicture();
  const [slug, setSlug] = useState<string | null>(null);
  const who = me.state === "in" ? me.name : null;

  useEffect(() => {
    // Signed out: nothing to ask, and the card hides below.
    if (who === null) return;
    let alive = true;
    /** Patrons saved while the card is up, so an answer asked for before one is not taken over it. */
    let saves = 0;

    /** The card for a patron on a day: shown on their name day, and on no other. */
    async function show(patron: string | null, day: string) {
      if (!patron) {
        if (alive) setSlug(null);
        return;
      }
      const { patronFacts } = await import("@/lib/widget/state");
      const facts = patronFacts({ kind: "saint", slug: patron }, day, readCalendarStyleDefault());
      if (alive) setSlug(facts?.daysToNameDay === 0 ? facts.slug : null);
    }

    void (async () => {
      const day = todayKey();
      const asked = saves;
      let patron = readKept(day, who)?.slug;
      if (patron === undefined) {
        try {
          const res = await apiFetch("/api/profile/patron-saint", { cache: "no-store" });
          const body: unknown = res.ok ? await res.json().catch(() => null) : null;
          const { readPatronAnswer } = await import("@/lib/widget/state");
          // Signed in, as the card asks only then: a 401 is a token not yet
          // renewed and not "no saint" (note 85), so it is asked again.
          const answer = readPatronAnswer(res.status, body, true);
          // No plain answer (no signal, an error page): ask again next time.
          if (answer.kind === "unknown") return;
          // A patron saved meanwhile is newer than this answer.
          if (asked !== saves) return;
          patron = answer.kind === "saint" ? answer.slug : null;
          keep({ day, who, slug: patron });
        } catch {
          return;
        }
      }
      if (asked === saves) await show(patron, day);
    })();

    // A patron saved in the app (lib/profile/patronEvent.ts): the card
    // follows at once, and keeps the saved one for the day as it keeps the
    // server's answer. The event carries what the server saved.
    const onPatron = (event: Event) => {
      saves += 1;
      const saved = (event as CustomEvent<PatronChange>).detail;
      void import("@/lib/widget/state")
        .then(({ readPatronAnswer }) => {
          const answer = readPatronAnswer(200, saved);
          if (!alive || answer.kind === "unknown") return;
          const day = todayKey();
          const patron = answer.kind === "saint" ? answer.slug : null;
          keep({ day, who, slug: patron });
          return show(patron, day);
        })
        .catch(() => {
          // Offline before the chunk was cached: the card asks when it next shows.
        });
    };
    window.addEventListener(PATRON_EVENT, onPatron);
    return () => {
      alive = false;
      window.removeEventListener(PATRON_EVENT, onPatron);
    };
  }, [who]);

  if (!slug || who === null) return null;
  const saint = (profiledSaints as SaintBrief[]).find((s) => s.slug === slug);
  if (!saint) return null;
  const words = saintWordsFor(slug);

  return (
    <article data-name-day="" className={cn("rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5", className)}>
      <div className="flex items-center gap-3">
        {saint.iconUrl ? (
          // The app's own icon, in the calendar's frame (three wide by four
          // tall, the icons' own middle shape): the frame stands at once and
          // the icon comes into it whole, so the name beside it never moves
          // (build 85, note 52). It was as wide as the icon, nothing until it came.
          <span aria-hidden className="relative h-14 w-[42px] shrink-0 overflow-hidden rounded-[8px] bg-paper/[0.05] ring-1 ring-paper/10">
            <ArrivingImage src={saint.iconUrl} decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-heading text-ui font-semibold leading-tight text-paper">{t("today.nameDay.title")}</h2>
          <Link
            href={`/saints/${saint.slug}`}
            className="mt-0.5 block font-sans text-caption text-paper/60 underline-offset-4 hover:underline"
          >
            {saint.name}
          </Link>
        </div>
      </div>
      {words ? (
        <>
          <blockquote lang="en" className="mt-3 font-serif text-ui leading-[1.5] text-paper/85">
            {words.text}
          </blockquote>
          <SourceLine cite={words.shown} className="mt-2" />
        </>
      ) : null}
    </article>
  );
}
