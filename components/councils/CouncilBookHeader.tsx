"use client";

import Link from "next/link";
import { useState } from "react";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { StartReading } from "@/components/reading/BookHeader";
import { readingTime } from "@/components/reading/CoverRow";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { eraKey, type EraId } from "@/lib/reading/catalog";
import { windowStyle, type CoverWindow } from "@/lib/reading/coverWindow";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/** The council's icon in the byline: its middle, near. */
const BYLINE_CROP: CoverWindow = { x: 0.5, y: 0.42, zoom: 2.4 };

/**
 * The top of a council's document as a book's page in the reading room (1.8,
 * the owner's pick of r3-03, "One of its books, in the room's reader"), the
 * Fathers' book page (components/reading/BookHeader.tsx) made a council's:
 * the cover held up, a window onto the council's icon, or the room's plate
 * for a local council; the title, the page's one heading; what it is; the
 * council and its year with the council's icon, to the council's page; how
 * long and its era; the edition its words are from; what it holds; and Start
 * reading, or Continue where the reader left off. Written with the page, so
 * the apps draw it before anything is read.
 */
export function CouncilBookHeader({
  title,
  subtitle,
  blurb,
  author,
  council,
  cover,
  minutes,
  era,
  edition,
  positionKey,
  docSlug,
  first,
  total,
}: {
  title: string;
  subtitle?: string;
  blurb?: string;
  /** The council and its year: "First Council of Nicaea, 325". */
  author: string;
  /** The council's page, and its name for the way back on a computer. */
  council: { href: string; name: string };
  cover?: { src: string; focusY: number; crop?: CoverWindow };
  minutes: number;
  era: EraId;
  /** The edition the words are from, without its publisher and its notes. */
  edition: string;
  /** Where the reader's place is kept (components/councils/CouncilReader.tsx). */
  positionKey: string;
  docSlug: string;
  first: number;
  total: number;
}) {
  const { t } = useTranslate();
  return (
    <header data-book-header="" data-council-book="" className="border-b border-paper/8 pb-8 pt-6 md:pb-12 md:pt-14">
      <nav aria-label={t("study.councils.theCouncils")} className="mb-10 hidden items-center gap-1.5 font-sans text-detail text-paper/55 md:flex native-md-hidden">
        <Link href="/councils" className="hover:text-paper">
          {t("study.councils.theCouncils")}
        </Link>
        <ChevronRight size={13} className="shrink-0 text-paper/30 rtl:-scale-x-100" />
        <Link href={council.href} className="truncate hover:text-paper">
          {council.name}
        </Link>
        <ChevronRight size={13} className="shrink-0 text-paper/30 rtl:-scale-x-100" />
        <span className="truncate text-paper">{title}</span>
      </nav>

      <div className="flex flex-col items-center text-center md:flex-row md:items-start md:gap-10 md:text-start">
        <WorkCover
          title={title}
          author={author}
          iconUrl={cover?.src}
          focusY={cover?.focusY}
          crop={cover?.crop}
          size="hero"
          priority
          className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]"
        />
        <div className="mt-6 flex min-w-0 max-w-[620px] flex-col items-center md:mt-1 md:items-start">
          <h1 id="work-title" lang="en" className="text-title font-semibold leading-[1.12] tracking-[-0.01em] text-paper text-balance md:text-heading">
            {title}
          </h1>
          {subtitle ? (
            <p lang="en" className="mt-2 font-sans text-ui leading-[1.5] text-paper/60 text-balance">
              {subtitle}
            </p>
          ) : null}
          <p className="mt-3 flex max-w-full items-center gap-2 font-sans text-ui text-paper/85">
            {cover ? <CouncilIcon src={cover.src} /> : null}
            <Link
              href={council.href}
              data-byline=""
              lang="en"
              className="min-w-0 truncate underline decoration-paper/30 underline-offset-4 hover:decoration-paper"
            >
              {author}
            </Link>
          </p>
          <p className="mt-1.5 font-sans text-caption text-paper/50">
            {readingTime(minutes, t)} · {t(eraKey(era))}
          </p>
          <p data-council-edition="" lang="en" className="mt-1 max-w-[46ch] font-sans text-caption leading-[1.45] text-paper/50 text-balance">
            {edition}
          </p>
          {blurb ? (
            <p lang="en" className="mt-4 max-w-[58ch] font-sans text-ui leading-[1.6] text-paper/70">
              {blurb}
            </p>
          ) : null}
          <StartReading saintSlug={positionKey} workSlug={docSlug} first={first} total={total} />
        </div>
      </div>
    </header>
  );
}

/** The council's icon, round, beside its name: it fades in when it arrives, and is not there when it cannot. */
function CouncilIcon({ src }: { src: string }) {
  const { ref, onArrive } = useArrivingImage(src);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span aria-hidden className="dark-island relative block size-[22px] shrink-0 overflow-hidden rounded-full bg-night ring-1 ring-paper/15">
      {/* eslint-disable-next-line @next/next/no-img-element -- the council's icon, a window onto it. */}
      <img
        ref={ref}
        src={src}
        alt=""
        decoding="async"
        onLoad={onArrive}
        onError={() => setFailed(true)}
        className="img-arrive absolute inset-0 h-full w-full object-cover"
        style={windowStyle(BYLINE_CROP)}
      />
    </span>
  );
}
