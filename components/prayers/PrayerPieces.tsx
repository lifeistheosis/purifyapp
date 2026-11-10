"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { ScrollRail } from "@/components/ui/ScrollRail";
import type { HourSlug } from "@/lib/prayers/hourNow";
import { cropStyle, tileCrop } from "@/lib/prayers/iconCrops";
import { RULES } from "@/lib/prayers/rules";
import { serviceArt } from "@/lib/prayers/serviceArt";

/**
 * All prayers on a phone (1.9, build 89 note 10, his words: "I'm kind of
 * getting sick of the like floating pills ... just not here"): the quick
 * ways in as small pieces, each its own icon (the one the app pairs with it,
 * lib/prayers/serviceArt.ts, cut as Practices' tiles are), its name, and its
 * length or its one line, in place of a row of outlined pills. The row clicks
 * under the finger as each piece passes its middle (lib/ui/scrollTicks.ts),
 * in the apps only, as the Bible's chapter strip does.
 *
 * The Hours wear the Hour the clock is in once the page knows it, as the
 * Practices tile does; until then the Hours' own line, so nothing moves.
 */
type Piece = { href: string; name: ReactNode; line: ReactNode; art: { src: string; slug: string } | null };

export function PrayerPieces({ hourNow }: { hourNow: HourSlug | null }) {
  const { t, tn } = useTranslate();
  const minutes = (id: string) => {
    const n = RULES.find((r) => r.id === id)?.estimatedMinutes;
    return n ? tn("prayers.approxMin", n) : null;
  };
  const hourArt = hourNow ? serviceArt(hourNow) : serviceArt("hours");
  const pieces: Piece[] = [
    { href: "/prayers/morning", name: t("prayers.rule.morning.title"), line: minutes("morning"), art: serviceArt("morning") },
    { href: "/prayers/evening", name: t("prayers.rule.evening.title"), line: minutes("evening"), art: serviceArt("evening") },
    {
      href: "/prayers/hours",
      name: t("prayers.hours"),
      line: hourNow ? `${t("prayers.timeline.now")} · ${t(`prayers.rule.${hourNow}.title`)}` : t("ui.sanctifyTheDay"),
      art: hourArt,
    },
    { href: "/prayers/akathists", name: t("prayers.akathists"), line: t("ui.hymnsOfPraise"), art: serviceArt("akathist-theotokos") },
    { href: "/prayers/learning", name: t("ui.learnToPray"), line: t("ui.aBeginnersPath"), art: serviceArt("learning") },
  ];
  return (
    <ScrollRail as="ul" arrows={false} ticks trackClassName="gap-3 px-5 pb-1">
      {pieces.map((p) => (
        <li key={p.href} className="w-[112px] shrink-0" data-prayer-piece={p.href}>
          <Link href={p.href} className="tap-press group block rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper">
            <span className="relative block h-[112px] w-[112px] overflow-hidden rounded-[18px] bg-night-soft shadow-[0_10px_22px_-12px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-paper/10">
              {p.art ? (
                <ArrivingImage
                  src={p.art.src}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={cropStyle(tileCrop(p.art.slug))}
                />
              ) : null}
            </span>
            <span className="mt-2 block line-clamp-2 font-sans text-detail font-semibold leading-snug text-paper">{p.name}</span>
            {p.line ? <span className="mt-0.5 block line-clamp-2 font-sans text-caption leading-[1.35] text-paper/55">{p.line}</span> : null}
          </Link>
        </li>
      ))}
    </ScrollRail>
  );
}
