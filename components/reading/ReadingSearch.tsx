"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { cn } from "@/lib/cn";
import {
  ERAS,
  LENGTHS,
  THEME_GROUPS,
  TRADITIONS,
  eraKey,
  eraSpanKey,
  lengthKey,
  themeKey,
  themesIn,
  traditionKey,
  type ThemeGroup,
} from "@/lib/reading/catalog";
import { hrefFor, optionCounts, searchCards, type Filters, type Room } from "@/lib/reading/select";

import { cardMeta } from "./CoverRow";
import { FilterSheet, type FilterGroup } from "./FilterSheet";

type Which = keyof Filters;
const CHIPS: { which: Which; key: string }[] = [
  { which: "theme", key: "reading.filter.theme" },
  { which: "tradition", key: "reading.filter.tradition" },
  { which: "author", key: "reading.filter.author" },
  { which: "era", key: "reading.filter.era" },
  { which: "length", key: "reading.filter.length" },
];

/**
 * The covers of the grid's first screen, about four rows at three across on a
 * phone: asked for at once, so they arrive with the search and never wait
 * long. The rest load as the grid is scrolled to them. Each waits for its
 * picture in the page's own colour and arrives whole (1.8, the owner's note
 * 13 of build 80; components/covers/WorkCover.tsx, `hold`).
 */
const FIRST_SCREEN = 12;

const GROUP_HEADING: Record<ThemeGroup, string> = {
  passions: "reading.row.passions",
  virtues: "reading.row.virtues",
  life: "reading.row.life",
  seasons: "reading.filter.seasons",
};

/**
 * The room's search (1.7, the owner's note 18: "keywords and tags"): the
 * field, a row of filter chips (theme, tradition, author, era, length) that
 * each open one movable sheet, and the books that match as a grid of covers,
 * three across on a phone. It reads the cards the page was handed and asks
 * the network for nothing. The query and the filters are the page's address
 * (the room keeps them there), so a theme on a book's page opens the room
 * already filtered, and Back comes home to the same search.
 */
export function ReadingSearch({ room, query, filters, onFilter }: { room: Room; query: string; filters: Filters; onFilter: (which: Which, value: string | undefined) => void }) {
  const { t, tn } = useTranslate();
  const [sheet, setSheet] = useState<Which | null>(null);

  const labels = useMemo(
    () => ({
      theme: (id: Parameters<typeof themeKey>[0]) => t(themeKey(id)),
      tradition: (id: Parameters<typeof traditionKey>[0]) => t(traditionKey(id)),
      era: (id: Parameters<typeof eraKey>[0]) => t(eraKey(id)),
    }),
    [t],
  );
  const results = useMemo(() => searchCards(room, query, filters, labels), [room, query, filters, labels]);

  const valueLabel = (which: Which): string | null => {
    const v = filters[which];
    if (!v) return null;
    if (which === "theme") return t(themeKey(v as never));
    if (which === "tradition") return t(traditionKey(v as never));
    if (which === "era") return t(eraKey(v as never));
    if (which === "length") return t(lengthKey(v as never));
    return room.authors[v]?.name ?? v;
  };

  const groupsFor = (which: Which): FilterGroup[] => {
    if (which === "theme") {
      return THEME_GROUPS.map((g) => {
        const ids = themesIn(g);
        const counts = optionCounts(room, query, filters, labels, "theme", ids);
        return { heading: t(GROUP_HEADING[g]), options: ids.map((id) => ({ value: id, label: t(themeKey(id)), count: counts.get(id) ?? 0 })) };
      });
    }
    if (which === "tradition") {
      const ids = TRADITIONS.map((x) => x.id).filter((id) => room.cards.some((c) => c.traditions.includes(id)));
      const counts = optionCounts(room, query, filters, labels, "tradition", ids);
      return [{ options: ids.map((id) => ({ value: id, label: t(traditionKey(id)), count: counts.get(id) ?? 0 })) }];
    }
    if (which === "era") {
      const ids = ERAS.map((x) => x.id);
      const counts = optionCounts(room, query, filters, labels, "era", ids);
      return [{ options: ids.map((id) => ({ value: id, label: t(eraKey(id)), sub: t(eraSpanKey(id)), count: counts.get(id) ?? 0 })) }];
    }
    if (which === "length") {
      const ids = LENGTHS.map((x) => x.id);
      const counts = optionCounts(room, query, filters, labels, "length", ids);
      return [{ options: ids.map((id) => ({ value: id, label: t(lengthKey(id)), count: counts.get(id) ?? 0 })) }];
    }
    const slugs = Object.keys(room.authors).sort((a, b) => room.authors[a].name.localeCompare(room.authors[b].name));
    const counts = optionCounts(room, query, filters, labels, "author", slugs);
    return [{ options: slugs.map((s) => ({ value: s, label: room.authors[s].name, count: counts.get(s) ?? 0 })) }];
  };

  const any = CHIPS.some(({ which }) => filters[which]);

  return (
    <div data-reading-search="">
      <ChipScroller label={t("shop.filters")} className="mt-3" gap="gap-2">
        {CHIPS.map(({ which, key }) => {
          const value = valueLabel(which);
          return (
            <button
              key={which}
              type="button"
              aria-haspopup="dialog"
              aria-pressed={Boolean(value)}
              onClick={() => setSheet(which)}
              className={cn(
                "tap-press hit-44 inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-4 font-sans text-detail font-semibold motion-safe:transition-colors",
                value ? "border-paper bg-paper text-night" : "border-paper/15 text-paper/75 hover:border-paper/35 hover:text-paper",
              )}
            >
              <span className="max-w-[16ch] truncate">{value ?? t(key)}</span>
              <ChevronDown size={13} className={value ? "text-night/60" : "text-paper/45"} />
            </button>
          );
        })}
        {any ? (
          <button
            type="button"
            onClick={() => CHIPS.forEach(({ which }) => filters[which] && onFilter(which, undefined))}
            className="tap-press hit-44 inline-flex min-h-9 items-center rounded-pill px-3 font-sans text-detail font-semibold text-paper/60 hover:text-paper"
          >
            {t("reading.filter.clear")}
          </button>
        ) : null}
      </ChipScroller>

      <p aria-live="polite" className="mt-4 font-sans text-detail text-paper/50">
        {tn("saints.workCount", results.length)}
      </p>

      {results.length === 0 ? (
        <p className="mt-8 max-w-[40ch] font-sans text-ui leading-[1.55] text-paper/65">{t("reading.empty.search")}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-6 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 md:gap-x-4 lg:grid-cols-6">
          {results.map((c, i) => {
            const author = c.author ?? t("reading.work.anonymous");
            const name = [c.title, author].join(", ");
            return (
              <li key={c.key} className="min-w-0">
                <Link href={hrefFor(c, filters.theme)} prefetch={false} className="press-card group block rounded-[6px]">
                  <span className="sr-only">{name}</span>
                  <WorkCover title={c.title} author={author} iconUrl={c.cover?.src} focusY={c.cover?.focusY} size="grid" eager={i < FIRST_SCREEN} hold="self" />
                  <span className="mt-2 block truncate font-sans text-caption text-paper/55">{cardMeta(c, t)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {CHIPS.map(({ which, key }) => (
        <FilterSheet
          key={which}
          open={sheet === which}
          onClose={() => setSheet(null)}
          title={t(key)}
          groups={sheet === which ? groupsFor(which) : []}
          selected={filters[which]}
          onSelect={(v) => onFilter(which, v)}
        />
      ))}
    </div>
  );
}
