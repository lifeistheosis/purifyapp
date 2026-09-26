"use client";

import Link from "next/link";

import { useToday } from "@/lib/calendar/useToday";
import {
  pickFeatured,
  type FeaturedCouncilSummary,
  type FeaturedTopicSummary,
} from "@/lib/discover/featured";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The "Featured today" pair on the desktop Discover page.
 *
 * Client-side for the same reason its mobile twin is
 * (components/mobile/FeaturedToday.tsx): the page is a server component,
 * and under the Android static export a server component renders once, at
 * build time. The desktop tree ships into the export behind `hidden md:*`,
 * so on an Android tablet at md and above a surface labelled "Featured
 * today" showed the same topic and the same council for the life of the
 * APK.
 *
 * The candidates are summarised on the server (a handful of each, a few KB)
 * and the day is chosen on the device.
 */
export function FeaturedTodayDesktop({
  topics,
  councils,
  heading,
}: {
  topics: FeaturedTopicSummary[];
  councils: FeaturedCouncilSummary[];
  heading: React.ReactNode;
}) {
  const { t } = useTranslate();
  const today = useToday();
  if (!today) return null;

  const { topic, council } = pickFeatured(topics, councils, today);
  if (!topic && !council) return null;

  return (
    <section className="mt-16">
      {/* The front page's eyebrow and cards, like the rest of Discover since
          the 2026-09-26 redo: Lora Bold names, DM Sans for the rest. */}
      <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60">
        {heading}
      </p>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {topic ? (
          <Link
            href={`/topics/${topic.slug}`}
            className="group rounded-2xl border border-paper/12 bg-paper/[0.04] p-6 transition-colors hover:border-paper/30 hover:bg-paper/[0.07]"
          >
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-paper/55">
              {t("discover.tile.topics")}
            </p>
            <h3 className="mt-2 text-title-sm leading-snug text-paper">{topic.title}</h3>
            {topic.definition ? (
              <p className="mt-1.5 font-sans text-detail text-paper/65 leading-[1.55] line-clamp-2">
                {firstSentence(topic.definition)}
              </p>
            ) : null}
          </Link>
        ) : null}
        {council ? (
          <Link
            href={`/councils/${council.slug}`}
            className="group rounded-2xl border border-paper/12 bg-paper/[0.04] p-6 transition-colors hover:border-paper/30 hover:bg-paper/[0.07]"
          >
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-paper/55">
              {t("discover.tile.councils")}
            </p>
            <h3 className="mt-2 text-title-sm leading-snug text-paper">{council.byname}</h3>
            <p className="mt-1.5 font-sans text-detail text-paper/65 leading-[1.55]">
              {council.year} · {council.location}
            </p>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function firstSentence(s: string): string {
  if (!s) return "";
  const match = s.match(/^.+?[.!?](?:\s|$)/);
  return (match ? match[0] : s).trim();
}
