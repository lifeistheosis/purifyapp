"use client";

import Link from "next/link";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverRow, CoverTile, cardMeta, readingTime } from "@/components/reading/CoverRow";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { CouncilBook, ShelfCouncil } from "@/lib/councils/books";
import { avifFor } from "@/lib/media/streamed";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

/**
 * A council's shelf in the reading room (1.8, the owner's build 80 note 12,
 * "Read the Council's documents opens the reading room", and his pick of
 * r3-03: "Where Read the Council's documents leads, in all three"). The
 * council's icon is the room's backdrop, grey and dim, lit from above; over
 * it the council, how many books and how long they take, and its documents
 * as books, each a window onto that icon with the council and its year as
 * the author line (lib/councils/books.ts). Every book opens in the room's
 * reader. Under them the way to the council's own page, and the other
 * councils, each by its own document, to swipe.
 *
 * A local council has no picture: no backdrop, and its books are the room's
 * plate with the title alone.
 */
export function CouncilShelf({ council, books, others }: { council: ShelfCouncil; books: CouncilBook[]; others: CouncilBook[] }) {
  const { t, tn } = useTranslate();
  const minutes = books.reduce((n, b) => n + b.minutes, 0);

  return (
    <article data-council-shelf={council.slug} className="relative bg-night pb-24">
      {council.picture ? <Backdrop src={council.picture.src} focus={council.picture.focus} /> : null}

      <div className="relative mx-auto w-full max-w-[1100px] px-5 pt-5 md:px-8 md:pt-14">
        <header className="text-center">
          {/* The two small lines stand on the council's icon and the light from
              above it, in the house's soft edge of the page's ground
              (globals.css, Words on a picture) and at the least ink that holds 4.5:1 there over
              each of the seven councils' icons, on the five palettes and the
              seventeen looks: at 70 and 55 they read 3.07 to 3.92:1 once the
              icon was drawn with no signal too, and at 90 and 80 still 4.14
              under the First of Constantinople and 4.31 under the Second of
              Nicaea (the gate's final run of 2026-11-12). */}
          <p className="words-halo font-sans text-caption font-semibold text-paper">
            {t(council.ordinalKey)} · {council.year}
          </p>
          <h1
            id="shelf-title"
            lang="en"
            dir="ltr"
            className="mt-1.5 font-serif text-[26px] font-bold leading-[1.1] tracking-[-0.01em] text-balance text-paper md:text-display-sm"
          >
            {council.byname}
          </h1>
          <p className="words-halo mt-1.5 font-sans text-caption text-paper/90">
            {tn("councils.books", books.length)} · {readingTime(minutes, t)}
          </p>
        </header>

        <ul className="mx-auto mt-6 flex max-w-[360px] flex-wrap justify-center gap-x-3 gap-y-5 md:max-w-none md:gap-x-5">
          {books.map((b, i) => (
            <li key={b.key} className="w-[104px] md:w-[148px]">
              <Link href={b.href} prefetch={false} className="press-card group block rounded-[6px]">
                {b.author ? (
                  <span className="sr-only" lang="en" dir="ltr">
                    {[b.title, b.author].join(", ")}
                  </span>
                ) : (
                  <span className="sr-only">
                    <span lang="en" dir="ltr">{b.title}</span>{`, ${t("reading.work.anonymous")}`}
                  </span>
                )}
                <WorkCover
                  title={b.title}
                  author={b.author ?? t("reading.work.anonymous")}
                  authorLang={b.author ? "en" : null}
                  iconUrl={b.cover?.src}
                  focusY={b.cover?.focusY}
                  crop={b.cover?.crop}
                  size="grid"
                  priority={i === 0}
                  eager
                  hold="self"
                />
                {/* At 75 on Light, where the backdrop's foot is under the first row: at Light's 70 the minutes read
                    4.17 to 4.49:1 there (the gate's confirm run, 2026-11-12). The looks lift it further on their own. */}
                <span className="mt-2 block text-center font-sans text-caption text-paper/55 [html[data-reading-mode=parchment]:not([data-look])_&]:text-paper/75">
                  {cardMeta(b, t)}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center">
          <Link
            href={`/councils/${council.slug}`}
            className="tap-press hit-44 inline-flex items-center gap-0.5 font-sans text-detail font-semibold text-paper/70 hover:text-paper"
          >
            {t("councils.shelf.page")}
            <ChevronRight size={14} className="rtl:-scale-x-100" />
          </Link>
        </p>

        {others.length ? (
          <CoverRow id="other-councils" title={t("councils.shelf.others")} seeAll="/reading/councils" className="mt-10">
            {others.map((b) => (
              <CoverTile key={b.key} card={b} href={b.href} meta={cardMeta(b, t)} />
            ))}
          </CoverRow>
        ) : null}

        {council.picture ? (
          <p data-council-credit="" className="mt-10 font-sans text-[11px] leading-snug text-paper/45">
            {council.picture.credit}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/**
 * The room's backdrop: the council's icon, grey and dim, lit softly from
 * above and fading into the page under the books. It arrives by fading in
 * (`.img-arrive`, on the app's motion switch), never in bands.
 */
function Backdrop({ src, focus }: { src: string; focus: string }) {
  const { ref, onArrive } = useArrivingImage(src);
  // The AVIF the apps carry, offered first, so the room has its icon with no signal (lib/media/streamed.ts, avifFor).
  const avif = avifFor(src);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[372px] overflow-hidden md:h-[460px]">
      <picture className="contents">
        {avif ? <source type="image/avif" srcSet={avif} /> : null}
        {/* The council's icon, as History carries it. */}
        <img
          ref={ref}
          src={src}
          alt=""
          decoding="async"
          onLoad={onArrive}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="img-arrive absolute inset-0 h-full w-full object-cover opacity-30 grayscale-[0.85] [-webkit-mask-image:linear-gradient(to_bottom,#000_40%,transparent_92%)] [mask-image:linear-gradient(to_bottom,#000_40%,transparent_92%)]"
          style={{ objectPosition: focus }}
        />
      </picture>
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgb(255_255_255/0.14),rgb(255_255_255/0)_70%)]" />
    </div>
  );
}
