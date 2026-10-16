"use client";

import { useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { CoverListRow } from "@/components/covers/CoverListRow";
import { WorkCover } from "@/components/covers/WorkCover";
import { workHref } from "@/lib/reading/workHref";
import type { Work } from "@/lib/saints/saints";
import { FilterPill } from "./FilterPill";

/** A long list gets topic chips; a short one is read at a glance. */
const CHIPS_FROM = 7;

/**
 * A saint's works on Purify, as the book rows of the reading room (1.7, the
 * owner's note 19: "'Read his works' should be the book rows of note 18, each
 * work opening its own book page"). Each work is the cover the reading room
 * gives it (lib/reading/cards.ts: the settled icon of the saint it is by or
 * about on the dark plate, its title in Lora, components/covers/WorkCover.tsx),
 * with
 * its title, one line of what it holds and when it was written, and two lines
 * of what it is; a tap opens the work (lib/reading/workHref.ts, where the
 * reading room's book page will take over).
 *
 * Given only what it draws: the works, the saint's slug, name and icon. It
 * used to be handed the whole saint, so every saint's life was written into
 * the page a second time for it.
 *
 * Above six works (St John Chrysostom has nineteen) a row of topics narrows
 * the list, the topics most works share first, sideways on a phone.
 */
export function SaintWritings({
  saintSlug,
  saintName,
  works,
}: {
  saintSlug: string;
  saintName: string;
  works: (Pick<Work, "slug" | "title" | "subtitle" | "year" | "blurb" | "topics"> & {
    /** The room's cover: a settled picture only, else the plate with the title. */
    cover?: { src: string; focusY: number };
    /** The name the cover carries: the author, or the saint a Life is about. */
    author?: string | null;
  })[];
}) {
  const { t, tn } = useTranslate();
  const [topic, setTopic] = useState<string | null>(null);

  // Topics across the works, the most shared first, then by name.
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of works) for (const name of w.topics ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [works]);

  const shown = topic ? works.filter((w) => w.topics?.includes(topic)) : works;
  const chips = works.length >= CHIPS_FROM && topics.length > 1;

  if (works.length === 0) return null;

  return (
    <div>
      <p className="font-sans text-detail text-paper/55" aria-live="polite">
        {topic
          ? tn("saints.worksOf", works.length, { shown: shown.length, total: works.length })
          : tn("saints.workCount", works.length)}
      </p>

      {chips ? (
        <ChipScroller label={t("saints.allTopics")} className="mt-3" gap="gap-2">
          <FilterPill label={t("saints.allTopics")} active={topic === null} onClick={() => setTopic(null)} />
          {topics.map(([name, n]) => (
            <FilterPill
              key={name}
              label={name}
              count={n}
              active={topic === name}
              onClick={() => setTopic((cur) => (cur === name ? null : name))}
            />
          ))}
        </ChipScroller>
      ) : null}

      <ul className="mt-2 divide-y divide-paper/8">
        {shown.map((w) => (
          <CoverListRow
            key={w.slug}
            href={workHref(saintSlug, w.slug)}
            cover={<WorkCover title={w.title} author={w.author === undefined ? saintName : (w.author ?? t("reading.work.anonymous"))} iconUrl={w.cover?.src} focusY={w.cover?.focusY} size="sm" />}
            title={w.title}
            meta={[w.subtitle, w.year].filter(Boolean).join(" · ") || undefined}
            blurb={w.blurb}
          />
        ))}
      </ul>

      {shown.length === 0 ? (
        <p className="mt-6 font-sans text-ui text-paper/55">{t("saints.noWorksTopic")}</p>
      ) : null}
    </div>
  );
}
