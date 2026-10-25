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

import Link from "next/link";
import { useEffect, useState } from "react";

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import profiledSaints from "@/data/calendar/profiled-saints.json";
import { apiFetch } from "@/lib/api/client";
import { readCalendarStyleDefault } from "@/lib/calendar/styleDefault";
import { cn } from "@/lib/cn";
import { useMyPicture } from "@/lib/profile/myPicture";
import { todayKey } from "@/lib/rhythm/dayKey";
import type { SaintBrief } from "@/lib/saints/brief";
import { saintWordsFor } from "@/lib/today/saintWords";

const KEY = "purify:nameday.patron";

type Kept = { day: string; who: string; slug: string | null };

function readKept(day: string, who: string): Kept | null {
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Kept | null;
    return kept && kept.day === day && kept.who === who ? kept : null;
  } catch {
    return null;
  }
}

function keep(kept: Kept): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(kept));
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
    void (async () => {
      const day = todayKey();
      let patron = readKept(day, who)?.slug;
      if (patron === undefined) {
        try {
          const res = await apiFetch("/api/profile/patron-saint", { cache: "no-store" });
          const body: unknown = res.ok ? await res.json().catch(() => null) : null;
          const { readPatronAnswer } = await import("@/lib/widget/state");
          const answer = readPatronAnswer(res.status, body);
          // No plain answer (no signal, an error page): ask again next time.
          if (answer.kind === "unknown") return;
          patron = answer.kind === "saint" ? answer.slug : null;
          keep({ day, who, slug: patron });
        } catch {
          return;
        }
      }
      if (!patron) return;
      const { patronFacts } = await import("@/lib/widget/state");
      const facts = patronFacts({ kind: "saint", slug: patron }, day, readCalendarStyleDefault());
      if (alive) setSlug(facts?.daysToNameDay === 0 ? facts.slug : null);
    })();
    return () => {
      alive = false;
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
          // eslint-disable-next-line @next/next/no-img-element -- the app's own icon, as it is.
          <img
            src={saint.iconUrl}
            alt=""
            decoding="async"
            className="h-14 w-auto shrink-0 rounded-[8px] ring-1 ring-paper/10"
          />
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
