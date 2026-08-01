"use client";

import { useToday } from "@/lib/calendar/useToday";
import {
  pickFeatured,
  type FeaturedCouncilSummary,
  type FeaturedTopicSummary,
} from "@/lib/discover/featured";
import { MobileCard } from "./MobileCard";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { T } from "@/components/i18n/T";

/**
 * The "Featured today" pair on Discover: one topic, one council, rotating
 * by day of year.
 *
 * Client-side because the parent is a server component, and under the
 * Android static export a server component renders once at build time. The
 * pick was therefore frozen for the life of the APK: a surface labelled
 * "Featured today" showed the same topic and the same council every day for
 * months. The candidates are summarised on the server (there are only a
 * handful of each, so the payload is a few KB) and the day is chosen here.
 */

export type {
  FeaturedTopicSummary,
  FeaturedCouncilSummary,
} from "@/lib/discover/featured";

export function FeaturedToday({
  topics,
  councils,
}: {
  topics: FeaturedTopicSummary[];
  councils: FeaturedCouncilSummary[];
}) {
  const today = useToday();
  if (!today || (!topics.length && !councils.length)) return null;

  const { topic, council } = pickFeatured(topics, councils, today);

  return (
    <div className="mt-7">
      <MobileSectionLabel>
        <T k="ui.featuredToday" />
      </MobileSectionLabel>
      <div className="space-y-3">
        {topic && (
          <MobileCard
            eyebrow="Featured topic"
            title={topic.title}
            href={`/topics/${topic.slug}`}
            tint="warm"
          >
            <p className="mt-2 font-serif italic text-ui text-paper/75 leading-[1.5]">
              {topic.definition}
            </p>
            <p className="mt-3 font-sans text-detail font-medium text-paper/75">
              {topic.citationCount} <T k="ui.citationsFromTheFathers" />
            </p>
          </MobileCard>
        )}
        {council && (
          <MobileCard
            eyebrow="Featured council"
            title={council.byname}
            href={`/councils/${council.slug}`}
            tint="gold"
          >
            <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.55]">
              <T k="ui.readTheCanonsTheCreed" />
            </p>
            <p className="mt-3 font-sans text-detail font-medium text-paper/75">
              <T k="ui.openTheCouncil" />
            </p>
          </MobileCard>
        )}
      </div>
    </div>
  );
}
