"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { readingTime } from "@/components/reading/CoverRow";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { cn } from "@/lib/cn";
import { windowStyle, type CoverWindow } from "@/lib/reading/coverWindow";

/** A book in the door's fan: its window onto the council's icon, its own cover's face, or none (a local council's plate). */
export type FanBook = { src?: string; focusY?: number; crop?: CoverWindow };

/**
 * The council page's one door to its books (1.8, the owner's pick of r3-03,
 * C's "Nicaea, at a glance": "one door to its books"; his build 80 note 12,
 * "Read the Council's documents opens the reading room"): "Read the Council's
 * documents", how many books there are in the reading room and how long they
 * take, and the first three as a small fan of covers, each a window onto the
 * council's icon (lib/councils/page.ts, CROPS). It opens the council's shelf
 * in the reading room.
 */
export function DocumentsDoor({ href, books, minutes, fan }: { href: string; books: number; minutes: number; fan: FanBook[] }) {
  const { t, tn } = useTranslate();
  // The first book in front, the second behind it at the start, the third at
  // the end. Each is placed from the start and the two behind lean outward, so
  // in Arabic and Urdu the fan mirrors whole (the guardrail's mirror rule,
  // 2026-11-11: placed from the left, the two swapped places instead). The
  // lean follows the page's direction, as the places do: Tailwind's rtl:
  // also matches by language, which a page turned round in its own language
  // would not follow.
  const [front, atStart, atEnd] = fan;
  return (
    <Link
      href={href}
      data-council-door=""
      className={cn(
        "press-card relative mt-6 flex items-center gap-3 overflow-hidden rounded-[18px] border border-paper/10 py-3.5 ps-4 pe-3.5",
        "bg-gradient-to-b from-paper/[0.07] to-paper/[0.03] shadow-[0_18px_30px_-20px_rgba(0,0,0,0.95)]",
      )}
    >
      <span className="block min-w-0 flex-1">
        <span className="block font-serif text-[16px] font-semibold leading-tight text-paper">{t("study.councils.readDocuments")}</span>
        <span className="mt-1 block font-sans text-caption text-paper/60">
          {tn("councils.booksInRoom", books)} · {readingTime(minutes, t)}
        </span>
      </span>
      <span aria-hidden className="relative block h-[58px] w-[78px] shrink-0">
        {atStart ? (
          <span className="absolute bottom-[3px] start-[2px] origin-bottom -rotate-[10deg] [[dir=rtl]_&]:rotate-[10deg]">
            <MiniCover book={atStart} width={34} />
          </span>
        ) : null}
        {atEnd ? (
          <span className="absolute bottom-[3px] start-[42px] origin-bottom rotate-[10deg] [[dir=rtl]_&]:-rotate-[10deg]">
            <MiniCover book={atEnd} width={34} />
          </span>
        ) : null}
        {front ? (
          <span className="absolute bottom-0 start-[20px]">
            <MiniCover book={front} width={38} />
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * A cover too small for its words: the picture and its fade alone, or the
 * room's plate, black with a pool of light, for a book with no picture.
 */
function MiniCover({ book, width }: { book: FanBook; width: number }) {
  return (
    <span
      className="dark-island relative block overflow-hidden rounded-[4px] bg-night shadow-[0_8px_14px_-6px_rgba(0,0,0,0.85)]"
      style={{
        width,
        height: Math.round(width * 1.5),
        backgroundImage: book.src
          ? "radial-gradient(130% 75% at 50% 0%, rgb(255 255 255 / 0.14), rgb(255 255 255 / 0) 72%)"
          : "radial-gradient(85% 55% at 50% 40%, rgb(255 255 255 / 0.16), rgb(255 255 255 / 0.05) 55%, rgb(255 255 255 / 0) 80%)",
      }}
    >
      {book.src ? (
        // The council's icon, a window onto it, coming in whole (build 85, note 52).
        <ArrivingImage
          src={book.src}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 h-full w-full object-cover"
          style={book.crop ? windowStyle(book.crop) : { objectPosition: `50% ${book.focusY ?? 22}%` }}
        />
      ) : null}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent to-black/75" />
    </span>
  );
}
