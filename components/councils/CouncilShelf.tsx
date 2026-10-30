"use client";

import Link from "next/link";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverRow, CoverTile, cardMeta, readingTime } from "@/components/reading/CoverRow";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { CouncilBook, ShelfCouncil } from "@/lib/councils/books";
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
          <p className="font-sans text-caption font-semibold text-paper/70">
            {t(council.ordinalKey)} · {council.year}
          </p>
          <h1 id="shelf-title" className="mt-1.5 font-serif text-[26px] font-bold leading-[1.1] tracking-[-0.01em] text-balance text-paper md:text-display-sm">
            {council.byname}
          </h1>
          <p className="mt-1.5 font-sans text-caption text-paper/55">
            {tn("councils.books", books.length)} · {readingTime(minutes, t)}
          </p>
        </header>

        <ul className="mx-auto mt-6 flex max-w-[360px] flex-wrap justify-center gap-x-3 gap-y-5 md:max-w-none md:gap-x-5">
          {books.map((b, i) => (
            <li key={b.key} className="w-[104px] md:w-[148px]">
              <Link href={b.href} prefetch={false} className="press-card group block rounded-[6px]">
                <span className="sr-only">{[b.title, b.author ?? t("reading.work.anonymous")].join(", ")}</span>
                <WorkCover
                  title={b.title}
                  author={b.author ?? t("reading.work.anonymous")}
                  iconUrl={b.cover?.src}
                  focusY={b.cover?.focusY}
                  crop={b.cover?.crop}
                  size="grid"
                  priority={i === 0}
                  eager
                  hold="self"
                />
                <span className="mt-2 block text-center font-sans text-caption text-paper/55">{cardMeta(b, t)}</span>
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
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[372px] overflow-hidden md:h-[460px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- the council's icon, as History carries it. */}
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
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgb(255_255_255/0.14),rgb(255_255_255/0)_70%)]" />
    </div>
  );
}
