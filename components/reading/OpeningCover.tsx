"use client";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useOnOpening } from "@/components/saints/useWorkPlace";
import { useCoversVersion } from "@/lib/readAloud/useCovers";
import { packedCard } from "@/lib/reading/packedCovers";
import type { Card } from "@/lib/reading/select";
import { openWorkAbout } from "@/lib/saints/workNow";

/**
 * How large it is held up: by the height of the screen. 160px wide, as a
 * walk's page holds its cover, on a phone 844px tall and up and on a
 * computer; narrower by a third of every pixel the screen is shorter, down
 * to 112px, the row's own tile, from 694px. Measured in the apps, where the
 * chapter pill stands over the tab bar (scripts/mock-opening-cover.mjs): at
 * a fixed 160px the first words of a book were under the pill on a phone
 * 688px tall or shorter, the first screen all front and no text. This way a
 * phone 667px tall (an iPhone SE) keeps nearly two of its first lines in
 * sight, and one 640px tall nearly one. `vh` is the screen's full height,
 * which does not change as a browser's bar comes and goes. Said twice, since
 * the row's tile has a width of its own on a computer. With the shadow of a
 * cover held up, as the walks' and About this book's have.
 */
const HELD_UP =
  "w-[clamp(112px,calc(32vh_-_110px),160px)] md:w-[clamp(112px,calc(32vh_-_110px),160px)] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]";

/**
 * A book opens on its cover (1.9; the owner's yes of 2026-11-10 to "a cover
 * at the head of a reading room book", so that the cover a reader taps in the
 * room travels into the page it opens, as every card's picture does:
 * lib/ui/routeMotion.ts, "A picture that leads to its own page").
 *
 * Since 1.8 a book opens straight on a chapter, read as the Bible reads
 * (components/saints/WorkHead.tsx), and its cover was only behind About this
 * book, so the room's cover had nothing on the page to become and left with
 * the room. Now the same poster the room shows (components/covers/
 * WorkCover.tsx, at the size a walk's page holds its cover) stands over the
 * head of the chapter the book opens on: the first, the one a row names, or
 * the one the reader left off in. Nothing else about the page changes; a
 * return still goes on to the paragraph it was left at, under the cover.
 *
 * Only that chapter wears it (components/saints/useWorkPlace.ts,
 * useOnOpening). Turn to another and the page is the chapter's own, as
 * before; come back to it and the page is as it was left, so a step back out
 * of the book finds the cover where the room's tile can take it again.
 *
 * Written with the page, above the reader and outside it: in the apps the
 * text arrives a moment after the page (components/saints/
 * LazyWritingReader.tsx), and the cover has to be standing when the page
 * changes, and stay the same element when the text lands, for a picture to
 * travel into it. It draws the tile's own picture: the covers pack laid over
 * it in the apps as the room lays it (lib/reading/packedCovers.ts), and a
 * council's document through its window onto the council's icon.
 *
 * A tap on it opens About this book (his word, 2026-11-10 about 13:50 UTC,
 * "All recommendations. Start.", which said yes to it): the book's own page,
 * where the same cover is held up beside what the book is, who wrote it and
 * where its words are from. Until then a reader had to find it under the
 * three dots or in the contents, where it also stays. The cover is the
 * button, all of it, so it is far larger than the 44px a finger needs; it
 * dips as a pressed cover does anywhere in the app (`.press-card`), and the
 * sheet it opens is the reader's own, with the sheet's own motion
 * (lib/saints/workNow.ts, openWorkAbout: the door the three dots use).
 *
 * The cover's words are hidden from assistive technology, as every cover's
 * are, so the button is named for what it does, in the reader's language
 * and in the words the other two doors use.
 */
export function OpeningCover({
  owner,
  slug,
  first,
  card: built,
}: {
  /** Where the book's place is kept: the saint's slug, or "councils/<council>" (lib/reader/position.ts). */
  owner: string;
  slug: string;
  /** The number of the book's first chapter. */
  first: number;
  /** What the room's tile for this book draws. */
  card: Pick<Card, "key" | "title" | "author" | "cover">;
}) {
  const { t } = useTranslate();
  const card = packedCard(built, useCoversVersion());
  const here = useOnOpening(owner, slug, first);
  if (!here) return null;
  return (
    <div data-opening-cover="" className="mb-7 flex justify-center">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={t("bible.aboutThisBook")}
        onClick={openWorkAbout}
        data-about-book=""
        className="press-card block cursor-pointer rounded-[6px]"
      >
        <WorkCover
          title={card.title}
          author={card.author ?? t("reading.work.anonymous")}
          iconUrl={card.cover?.src}
          focusY={card.cover?.focusY}
          crop={card.cover?.crop}
          // The row's own design, its words broken and fitted as the row's
          // tile breaks and fits them, so the cover that travels here is the
          // same poster, larger.
          size="row"
          priority
          className={HELD_UP}
        />
      </button>
    </div>
  );
}
