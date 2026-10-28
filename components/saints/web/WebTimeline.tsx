"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import type { SaintWebData, TimelineRow, WebNode } from "@/lib/saints/webLayout";

import { WebAvatar } from "./WebAvatar";

/**
 * The saint web's second view (1.8, round 1 B, "Thread", the owner's pick
 * with A and a switch): the same web down his life, year by year. Each moment
 * names the saints in it, and each saint opens his page. The moments are his
 * Life's own sentences that carry a year or name a saint of the web, the
 * councils he sat at and the moments of Orthodox History he is in, with his
 * birth and his repose where the registry gives a year (lib/saints/web.ts).
 * After his repose the line runs dashed. A moment his Life gives no year has
 * a small dot and an empty year. Whoever on the web has no moment here is
 * gathered at the foot, so the two views always hold the same people.
 */
export function WebTimeline({ data }: { data: SaintWebData }) {
  const { t } = useTranslate();
  const { center, timeline, reposedAt, undated } = data;
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const her = center.pronoun === "her";
  const last = timeline.length - 1;

  return (
    <div className="pb-12">
      <div className="flex items-center gap-3.5 pt-3">
        <WebAvatar node={{ kind: "saint", id: "center", person: center, ties: [] }} size={58} />
        <div className="min-w-0">
          <p className="font-serif text-title-sm font-bold leading-tight text-paper">{center.name}</p>
          <p className="mt-0.5 font-sans text-detail text-paper/60">
            {center.years ? (
              <>
                {center.years}
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
              </>
            ) : null}
            {t(her ? "saints.web.yearByYearHer" : "saints.web.yearByYearHis")}
          </p>
        </div>
      </div>

      <ol className="mt-6">
        {timeline.map((row, i) => {
          const after = reposedAt !== undefined && row.at > reposedAt;
          const year = row.year ?? "";
          return (
            <li key={i} className="grid grid-cols-[58px_22px_minmax(0,1fr)] pe-1">
              <span className="pe-2 pt-px text-end font-sans text-[12.5px] font-semibold whitespace-nowrap text-paper/50">{year}</span>
              <span aria-hidden className="relative">
                <span
                  className={cn(
                    "absolute start-[10px] w-[1.5px]",
                    i === 0 ? "top-[7px]" : "top-0",
                    i === last ? "h-[7px]" : "bottom-0",
                    after ? "saint-web-after" : "bg-paper/20",
                  )}
                />
                <Dot row={row} />
              </span>
              <div className="min-w-0 pb-[21px] ps-2">
                <RowWords row={row} />
                {"people" in row && row.people.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {row.people.map((id) => {
                      const node = byId.get(id);
                      return node ? <Chip key={id} node={node} /> : null;
                    })}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {undated.length ? (
        <section aria-labelledby="saint-web-undated" className="mt-4 border-t border-paper/10 pt-6">
          <h2 id="saint-web-undated" className="text-title-sm leading-tight text-paper">
            {t(her ? "saints.web.undatedHer" : "saints.web.undatedHis")}
          </h2>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {undated.map((id) => {
              const node = byId.get(id);
              return node ? <Chip key={id} node={node} /> : null;
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Dot({ row }: { row: TimelineRow }) {
  if (row.kind === "reposed") {
    return <span className="absolute start-[5.75px] top-[5px] h-[10px] w-[10px] rounded-full border-[1.5px] border-paper bg-night shadow-[0_0_0_4px_var(--color-night)]" />;
  }
  if (row.kind === "life" && !row.year) {
    return <span className="absolute start-[7.25px] top-[6.5px] h-[7px] w-[7px] rounded-full bg-paper/45 shadow-[0_0_0_4px_var(--color-night)]" />;
  }
  return <span className="absolute start-[5.75px] top-[5px] h-[10px] w-[10px] rounded-full bg-paper shadow-[0_0_0_4px_var(--color-night)]" />;
}

function RowWords({ row }: { row: TimelineRow }) {
  const { t } = useTranslate();
  const words = "font-sans text-[14.5px] leading-[1.42] text-paper/85";
  if (row.kind === "born" || row.kind === "reposed") {
    return (
      <p className={words}>
        {t(row.kind === "born" ? "saints.born" : "saints.reposed")}
        {row.note ? <span className="text-paper/60"> · {row.note}</span> : null}
      </p>
    );
  }
  if (row.kind === "event") {
    return (
      <>
        <Link href={row.href} prefetch={false} className={cn(words, "font-semibold text-paper underline-offset-4 hover:underline")}>
          {row.title}
        </Link>
        <p className={cn(words, "mt-1 text-paper/70")}>{row.text}</p>
      </>
    );
  }
  return <p className={words}>{row.text}</p>;
}

/** A saint or a council in a moment: its picture and its name, opening its page. */
function Chip({ node }: { node: WebNode }) {
  const href = node.kind === "saint" ? `/saints/${node.person.slug}` : `/councils/${node.slug}`;
  const name = node.kind === "saint" ? node.person.short : node.name;
  return (
    <Link
      href={href}
      prefetch={false}
      className="tap-press hit-44 inline-flex h-8 max-w-full items-center gap-[7px] rounded-pill border border-paper/10 bg-paper/[0.07] pe-3 ps-1 font-sans text-[12.5px] font-medium text-paper/90 hover:border-paper/25"
    >
      <WebAvatar node={node} size={24} />
      <span className="truncate">{name}</span>
    </Link>
  );
}
