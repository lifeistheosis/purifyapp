"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { formatDuration } from "@/lib/chants/media";
import { chantTitleKey, kindKey, traditionKey } from "@/lib/chants/names";
import type { ChantIndexRow } from "@/lib/chants/types";

import { ChantCover } from "./ChantCover";

/**
 * A row of chants under a name (1.7): this week's tone, the feast, the
 * Psalms, short chants, related chants. Several chants make a rail of
 * covers that scrolls sideways; one chant is one wide row, never a rail of
 * one with an empty run beside it. A row with none is not drawn at all.
 */
export function ChantRow({ heading, rows, id }: { heading: string; rows: ChantIndexRow[]; id: string }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby={`chants-row-${id}`} className="mt-9">
      <p id={`chants-row-${id}`} role="heading" aria-level={2} className="font-sans text-ui font-semibold text-paper">
        {heading}
      </p>
      {rows.length === 1 ? (
        <div className="mt-3">
          <ChantListItem row={rows[0]} />
        </div>
      ) : (
        <ScrollRail as="ul" className="-mx-5 mt-3" trackClassName="gap-3 px-5" snap>
          {rows.map((r) => (
            <li key={r.slug} className="w-[148px]">
              <ChantCard row={r} />
            </li>
          ))}
        </ScrollRail>
      )}
    </section>
  );
}

/** A chant as a cover with its name under it, for a rail. */
export function ChantCard({ row }: { row: ChantIndexRow }) {
  const { t } = useTranslate();
  const title = t(chantTitleKey(row.key));
  return (
    <Link href={`/chants/${row.slug}`} className="press-card group block">
      <ChantCoverFor row={row} title={title} size="card" className="w-full rounded-[12px]" />
      <span className="mt-2 block line-clamp-2 font-sans text-detail font-semibold leading-snug text-paper">{title}</span>
      <span className="mt-0.5 block truncate font-sans text-caption text-paper/50">{metaOf(row, t).join(" · ")}</span>
    </Link>
  );
}

/** A chant as one calm row: a small cover, the name, its tradition and length. */
export function ChantListItem({ row }: { row: ChantIndexRow }) {
  const { t } = useTranslate();
  const title = t(chantTitleKey(row.key));
  return (
    <Link
      href={`/chants/${row.slug}`}
      className="tap-press flex items-center gap-3 rounded-[12px] py-1.5 motion-safe:transition-colors hover:bg-paper/[0.04]"
    >
      <ChantCoverFor row={row} title={title} size="thumb" className="w-12 shrink-0 rounded-[8px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-ui font-semibold text-paper">{title}</span>
        <span className="mt-0.5 block truncate font-sans text-caption text-paper/50">{metaOf(row, t).join(" · ")}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-paper/40 rtl:-scale-x-100" />
    </Link>
  );
}

/** Tradition, kind, tone and length, the facts a list shows of a chant. */
export function metaOf(row: ChantIndexRow, t: (key: string, vars?: Record<string, string | number>) => string): string[] {
  return [
    row.traditions[0] ? t(traditionKey(row.traditions[0])) : null,
    t(kindKey(row.kind)),
    row.tone ? t("chants.tone", { n: row.tone }) : null,
    formatDuration(row.shortest),
  ].filter((x): x is string => Boolean(x));
}

function ChantCoverFor({
  row,
  title,
  size,
  className,
}: {
  row: ChantIndexRow;
  title: string;
  size: "card" | "thumb";
  className?: string;
}) {
  const { t } = useTranslate();
  return (
    <ChantCover
      cover={row.cover}
      title={title}
      tradition={row.traditions[0] ? t(traditionKey(row.traditions[0])) : undefined}
      size={size}
      className={className}
    />
  );
}
