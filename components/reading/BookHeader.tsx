"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { eraKey, themeKey, traditionKey, type ThemeId } from "@/lib/reading/catalog";
import type { Provenance } from "@/lib/reading/provenance";
import type { HeaderCard } from "@/lib/reading/select";
import { loadPosition } from "@/lib/reader/position";

import { readingTime } from "./CoverRow";
import { RoundIcon } from "./FeaturedWork";

/**
 * The top of a work's page as a book's page (1.7, the owner's note 18: "Work
 * page: cover, author with icon, minutes to read, era, tradition, tags,
 * chapters, Start reading, More like this"). It is written with the page, so
 * the apps show it before the work's text has been read from its file.
 *
 * The cover held up; the title, the page's one h1 (the slim bar shows it once
 * it has scrolled away); "By" the author, or "About" the saint a Life or a
 * retelling is about, with his icon, to his page; how long, its era and its
 * traditions, and "Selections" for an excerpt; its themes, each opening the
 * room filtered to it; what it is; and Start reading, or Continue where the
 * reader left off. On a tablet and a computer the cover stands beside it.
 */
export function BookHeader({
  card,
  blurb,
  authorHref,
  themes,
  saint,
  provenance,
  first,
  total,
}: {
  card: HeaderCard;
  blurb: string;
  /** The page of the saint the byline names, when there is one. */
  authorHref: string | null;
  /** The themes to show as chips, the work's own best ones first. */
  themes: ThemeId[];
  /** The saint whose page the work is under, for the way back on a computer. */
  saint: { slug: string; name: string };
  /** Where the words come from: checked against an edition, or ours (lib/reading/provenance.ts). */
  provenance: Provenance | null;
  /** The first section's number, and how many there are. */
  first: number;
  total: number;
}) {
  const { t } = useTranslate();
  const name = card.author ?? t("reading.work.anonymous");
  const byline =
    card.byline === "by" ? t("reading.work.by", { name }) : card.byline === "about" ? t("reading.work.about", { name }) : name;
  const facts = [
    card.selections ? t("reading.work.selections") : null,
    readingTime(card.minutes, t),
    card.era ? t(eraKey(card.era)) : null,
    ...card.traditions.map((id) => t(traditionKey(id))),
  ].filter(Boolean);

  return (
    <header data-book-header="" className="border-b border-paper/8 pb-8 pt-6 md:pb-12 md:pt-14">
      <nav aria-label={t("nav.saints")} className="mb-10 hidden items-center gap-1.5 font-sans text-detail text-paper/55 md:flex">
        <Link href="/saints" className="hover:text-paper">
          {t("nav.saints")}
        </Link>
        <ChevronRight size={13} className="shrink-0 text-paper/30 rtl:-scale-x-100" />
        <Link href={`/saints/${saint.slug}`} className="truncate hover:text-paper">
          {saint.name}
        </Link>
        <ChevronRight size={13} className="shrink-0 text-paper/30 rtl:-scale-x-100" />
        <span className="truncate text-paper">{card.title}</span>
      </nav>

      <div className="flex flex-col items-center text-center md:flex-row md:items-start md:gap-10 md:text-start">
        <WorkCover
          title={card.title}
          author={name}
          iconUrl={card.cover?.src}
          focusY={card.cover?.focusY}
          size="hero"
          priority
          className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]"
        />
        <div className="mt-6 flex min-w-0 max-w-[620px] flex-col items-center md:mt-1 md:items-start">
          <h1 id="work-title" lang="en" className="text-title font-semibold leading-[1.12] tracking-[-0.01em] text-paper text-balance md:text-heading">
            {card.title}
          </h1>
          {card.subtitle ? (
            <p lang="en" className="mt-2 font-sans text-ui leading-[1.5] text-paper/60">
              {card.subtitle}
            </p>
          ) : null}
          <p className="mt-3 flex items-center gap-2 font-sans text-ui text-paper/80">
            {card.cover ? <RoundIcon src={card.cover.src} focusY={card.cover.focusY} /> : null}
            {authorHref ? (
              <Link href={authorHref} data-byline="" className="min-w-0 truncate underline-offset-4 hover:underline">
                {byline}
              </Link>
            ) : (
              <span data-byline="" className="min-w-0 truncate">{byline}</span>
            )}
          </p>
          <p className="mt-1.5 font-sans text-caption text-paper/50">{facts.join(" · ")}</p>
          {provenance ? (
            <a
              href="#source"
              data-provenance={provenance.kind}
              className="mt-2 inline-flex max-w-[58ch] items-start gap-1.5 font-sans text-caption leading-[1.45] text-paper/60 underline-offset-4 hover:text-paper hover:underline"
            >
              {provenance.kind === "checked" ? <CheckMark /> : null}
              <span>
                {provenance.kind === "ours"
                  ? t("reading.work.ours")
                  : t(provenance.withNotes ? "reading.work.checkedNotes" : "reading.work.checked", { edition: provenance.edition })}
              </span>
            </a>
          ) : null}
          {themes.length ? (
            <ul aria-label={t("reading.work.themes")} className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              {themes.map((id) => (
                <li key={id}>
                  <Link
                    href={`/reading?theme=${id}`}
                    prefetch={false}
                    className="tap-press hit-44 inline-flex h-8 items-center rounded-pill border border-paper/15 px-3.5 font-sans text-detail font-medium text-paper/75 hover:border-paper/35 hover:text-paper"
                  >
                    {t(themeKey(id))}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {blurb ? (
            <p lang="en" className="mt-4 max-w-[58ch] font-sans text-ui leading-[1.6] text-paper/70">
              {blurb}
            </p>
          ) : null}
          <StartReading saintSlug={saint.slug} workSlug={card.key.split("/")[1]} first={first} total={total} />
        </div>
      </div>
    </header>
  );
}

/**
 * Start reading, at the first section; or, where this device has a place
 * saved in the work (lib/reader/position.ts), Continue reading there, with
 * which section it is. Decided after the page wakes: the server cannot know.
 * A council's document keeps its place the same way, under "councils/<its
 * council>" (components/councils/CouncilBookHeader.tsx).
 */
export function StartReading({ saintSlug, workSlug, first, total }: { saintSlug: string; workSlug: string; first: number; total: number }) {
  const { t } = useTranslate();
  const [saved, setSaved] = useState<number | null>(null);
  useEffect(() => {
    const pos = loadPosition(saintSlug, workSlug);
    // Read once the page has woken: the server has no saved place to draw.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pos && pos.sectionN > first) setSaved(pos.sectionN);
  }, [saintSlug, workSlug, first]);
  return (
    <div className="mt-6 flex flex-col items-center gap-1.5 md:items-start">
      <a
        href={`#s${saved ?? first}`}
        className="tap-press inline-flex h-12 items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
      >
        {saved !== null ? t("reading.continue") : t("reading.work.start")}
      </a>
      {saved !== null ? (
        <span className="font-sans text-caption text-paper/50">{t("saints.sectionOf", { n: saved - first + 1, total })}</span>
      ) : null}
    </div>
  );
}

/** A small tick before "Checked word for word". */
function CheckMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" className="mt-[2px] shrink-0">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
