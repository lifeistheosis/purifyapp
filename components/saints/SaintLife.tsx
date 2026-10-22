import type { ReactNode } from "react";

import type { Saint } from "@/lib/saints/saints";
import type { HistoryEventMeta } from "@/lib/history/events";
import type { ListedSource } from "@/components/citations/Marked";
import { shownCite } from "@/lib/citations/shown";
import { LIFE_QUOTES } from "@/lib/saints/lifeQuotes";
import { ViewInHistory } from "@/components/history/ViewInHistory";
import { T } from "@/components/i18n/T";
import { cn } from "@/lib/cn";
import { DisciplesSection } from "./DisciplesSection";
import { GreatFeastsSection } from "./GreatFeastsSection";
import { LifeSection } from "./LifeSection";
import { QuotesSection } from "./QuotesSection";
import { SaintFacts } from "./SaintFacts";
import { TitlesSection } from "./TitlesSection";

/**
 * The Life part of a saint's page (1.7): what he was, then the facts at a
 * glance, his titles where he has them, his life as it is written, his great
 * feasts, a few lines in his own words, his disciples, and the events of his
 * time in Orthodox History. Everything here was on the page before; it is
 * set calmly now, each part under a plain heading, parted by space and a
 * hairline. No word about the saint is new: the lives stay as written, and
 * stay marked for the future clergy review where they already are.
 *
 * The facts and the great feasts step aside on a computer, whose study rail
 * shows both (SaintStudyRail).
 */
export function SaintLife({
  saint,
  events,
}: {
  saint: Pick<
    Saint,
    "slug" | "shortBio" | "life" | "titles" | "greatFeasts" | "quotes" | "disciples" | "pronoun" | "featured" | "born" | "reposed" | "see" | "feastDays"
  >;
  events: HistoryEventMeta[];
}) {
  // The quotations inside the life, numbered in the order they stand, each
  // with its line (1.8, lib/saints/lifeQuotes.ts). A life in another
  // language marks only the words it shares with these.
  const written = saint.life.join("\n");
  const lifeSources: ListedSource[] = (LIFE_QUOTES[saint.slug] ?? [])
    .map((q) => ({ q, at: written.indexOf(q.words) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ q }, i) => ({ words: q.words, n: i + 1, shown: shownCite(q.cite) }));
  const after: { key: string; node: ReactNode; className?: string }[] = [];
  if (saint.greatFeasts?.length) {
    after.push({
      key: "feasts",
      className: "lg:hidden",
      node: <GreatFeastsSection feasts={saint.greatFeasts} pronoun={saint.pronoun} akathist={Boolean(saint.featured)} />,
    });
  }
  // A line no public-domain text we can find carries is kept in the registry
  // with where we looked, and not shown (the owner's word of 2026-10-18).
  const quotes = (saint.quotes ?? []).filter((q) => q.cite.kind !== "untraced");
  if (quotes.length) {
    after.push({ key: "quotes", node: <QuotesSection quotes={quotes} pronoun={saint.pronoun} /> });
  }
  if (saint.disciples?.length) {
    after.push({ key: "disciples", node: <DisciplesSection saint={saint} disciples={saint.disciples} /> });
  }

  return (
    <div>
      <p className="max-w-[640px] font-sans text-body leading-relaxed text-paper/80">{saint.shortBio}</p>
      <div className="mt-6 border-t border-paper/8 pt-5 lg:hidden">
        <SaintFacts saint={saint} />
      </div>
      {saint.titles?.length ? (
        <div className="mt-10">
          <TitlesSection titles={saint.titles} pronoun={saint.pronoun} />
        </div>
      ) : null}
      <div className="mt-10">
        <LifeSection paragraphs={saint.life} sources={lifeSources} saint={saint.slug} />
      </div>
      {after.map((section) => (
        <div key={section.key} className={cn("mt-12 border-t border-paper/8 pt-10", section.className)}>
          {section.node}
        </div>
      ))}
      <ViewInHistory events={events} title={<T k="saints.eventsDuringLife" />} />
    </div>
  );
}
