"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverRow, CoverTile, cardMeta } from "@/components/reading/CoverRow";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { CouncilBook, ShelfCouncil } from "@/lib/councils/books";

/**
 * Every council's shelf in the reading room (1.8, the owner's pick of r3-03:
 * "a shelf for each council"): where the other councils' See all leads. A
 * row of covers for each council, the seven first and then the local
 * councils by year, each row named by its council and leading to its shelf.
 */
export function CouncilShelves({ shelves }: { shelves: { council: ShelfCouncil; books: CouncilBook[] }[] }) {
  const { t } = useTranslate();
  return (
    <article data-council-shelves="" className="bg-night px-5 pb-24 pt-5 md:px-8 md:pt-14">
      <div className="mx-auto w-full max-w-[1100px]">
        <header>
          <h1 id="shelves-title" className="text-heading font-semibold leading-[1.08] tracking-[-0.02em] text-balance text-paper md:text-display-sm">
            {t("reading.surface.councils")}
          </h1>
          <p className="mt-3 max-w-[46ch] font-sans text-body leading-[1.55] text-paper/70">{t("reading.surface.councilsBlurb")}</p>
        </header>
        {shelves.map(({ council, books }) => (
          <CoverRow
            key={council.slug}
            id={`council-${council.slug}`}
            title={
              <Link href={`/reading/councils/${council.slug}`} className="inline-flex max-w-full items-baseline gap-1 hover:underline hover:underline-offset-4">
                <span className="truncate">{council.byname}</span>
                <ChevronRight size={15} className="shrink-0 self-center text-paper/45 rtl:-scale-x-100" />
              </Link>
            }
          >
            {books.map((b) => (
              <CoverTile key={b.key} card={b} href={b.href} meta={cardMeta(b, t)} />
            ))}
          </CoverRow>
        ))}
      </div>
    </article>
  );
}
