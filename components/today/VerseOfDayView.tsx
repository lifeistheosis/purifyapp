"use client";

import { useState } from "react";
import Link from "next/link";
import { Reference } from "@/components/bible/Reference";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Cross } from "@/components/ui/icons/Cross";
import { getBook, localBookNames, referenceIn } from "@/lib/bible/books";
import { useToday } from "@/lib/calendar/useToday";
import { useVerseTable } from "@/lib/packs/usePacks";
import { machineShown, machineVerseLanguage } from "@/lib/today/machineVerse";
import { useMachineVerseFile } from "@/lib/today/useMachineVerse";
import {
  verseDayKey,
  type VerseOfDayEntry,
} from "@/lib/today/verseOfDay.types";
import { VerseCardActions } from "./VerseCardActions";
import { T } from "@/components/i18n/T";

/** The reading the verse is from, as the card's line names it. */
const KIND_KEY = { gospel: "bible.kindGospelLong", epistle: "bible.kindEpistleLong", ot: "bible.kindOtLong" } as const;

/**
 * The Verse of the Day card itself. Client-side so it can read the
 * reader's own calendar day; the verse TEXT still comes from the server
 * (or, on Android, from the build), because it is loaded out of
 * data/bible through `server-only` code that cannot run on a device.
 *
 * `table` is a date-keyed window produced by the parent. See
 * lib/today/verseOfDay.ts for why it is a window rather than one entry.
 *
 * 1.8, the owner's pick B of round 10, "The light"
 * (Homebase/boards/purify-master/r18/choose/10-verse-of-the-day.png): a card
 * with the icon's light behind the words, a soft white at its top, the
 * three-bar cross lit over them, "Verse of the Day" with the reading it is
 * from, the whole verse in the reading serif in the middle, its reference,
 * and three round actions (VerseCardActions). The verse is never cut short:
 * a long one makes the card taller. A tap on the verse or its reference
 * still opens the chapter, as it has since 1.7.
 */
export function VerseOfDayView({
  table: bundled,
  headingId,
}: {
  table: Record<string, VerseOfDayEntry>;
  /** See VerseOfDayCard: promotes the label to a named `<h2>`. */
  headingId?: string;
}) {
  // In the apps, the days a content pack carries stand in front of the
  // build's own (lib/packs): a verse chosen after this build was made, or a
  // build that has outlived its window. Everywhere else this is `bundled`.
  const table = useVerseTable(bundled);
  const today = useToday();
  const { t, locale } = useTranslate();
  const books = localBookNames(t);
  const key = today ? verseDayKey(today) : null;
  // Before hydration, and if a long-installed build runs past the end of
  // its window, fall back to the first entry rather than an empty card.
  const keys = Object.keys(table);
  const vod = (key && table[key]) || (keys.length ? table[keys[0]] : null);
  const stale = Boolean(key && keys.length && !table[key]);
  // Which Bible the words are from (1.8), said quietly after the reference.
  const edition = vod ? `, ${t(getBook(vod.book)?.source === "brenton-lxx-pd" ? "reading.collection.brenton" : "reading.collection.kjv")}` : null;
  // The reading the verse is from, after the card's name: a chosen verse
  // from outside the day's reading, and the rotation's, name none.
  const kind = vod && vod.source !== "rotation" && vod.source !== "related" && !stale ? t(KIND_KEY[vod.source]) : null;
  const Label = headingId ? "h2" : "p";

  // TEMPORARY (lib/today/machineVerse.ts): in a language with no Bible of
  // its own, the verse machine-translated, never without its label, and the
  // English one tap away. Every other language gets null here, and the card
  // below is exactly what it was.
  const machineLanguage = machineVerseLanguage(locale);
  const machineFile = useMachineVerseFile(machineLanguage);
  const machine = machineShown(machineLanguage, machineFile, vod, books);
  const [english, setEnglish] = useState(false);
  const translated = machine && !english ? machine : null;

  return (
    <article className="lm-card relative overflow-hidden rounded-[24px] border border-paper/10 bg-night-deep px-[22px] pb-5 pt-6 text-center">
      {/* The icon's light, behind the words. */}
      <span aria-hidden className="verse-light pointer-events-none absolute left-1/2 top-[-120px] h-[300px] w-[380px] -translate-x-1/2" />
      <div className="relative">
        <span aria-hidden className="verse-cross-lit inline-flex text-paper">
          <Cross size={24} />
        </span>
        {/* The inline font is not a style preference: globals.css sets
            h1..h6 to Lora 700 UNLAYERED, which beats any font-* utility,
            so an <h2 className="font-sans"> would still render as bold
            Lora and this small label would change face the moment it
            became a heading. */}
        <Label
          id={headingId}
          style={headingId ? { fontFamily: "var(--font-sans)", fontWeight: 600 } : undefined}
          className="mt-2 font-sans text-[12.5px] font-semibold leading-snug text-paper/55"
        >
          <T k="today.verseOfDay" />
          {kind ? ` · ${kind}` : null}
        </Label>

        {/* The verse whole and its reference open the chapter. */}
        <Link href={vod?.href ?? "/bible"} className="tap-press mt-3 block">
          <p
            lang={machine ? (translated ? machine.language : "en") : undefined}
            className="font-serif text-[21px] font-medium leading-[1.45] text-paper"
          >
            {translated ? translated.text : vod?.text ?? (
              <span className="text-paper/45 italic">
                <T k="today.loadingVerse" />
              </span>
            )}
          </p>
          {/* The book in the reader's language, as the day's readings are,
              then which Bible the words are from (1.8), more quietly. */}
          <p className="mt-2.5 font-sans text-detail font-semibold text-paper/60">
            {vod ? <Reference>{referenceIn(vod.label, vod.book, books)}</Reference> : " "}
            {vod ? <span className="font-normal text-paper/40">{edition}</span> : null}
          </p>
        </Link>

        {/* The label sits outside the link, so a tap on it is never a tap
            into the chapter. */}
        {machine && (
          <div lang={machine.language} className="mt-3 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
            <p className="font-sans text-caption leading-snug text-paper/60">
              {translated ? machine.note : machine.original}
            </p>
            <button
              type="button"
              onClick={() => setEnglish((open) => !open)}
              className="-my-2 py-2 font-sans text-caption font-semibold text-paper/80 underline decoration-paper/30 underline-offset-4 hover:text-paper"
            >
              {english ? machine.showTranslation : machine.showOriginal}
            </button>
          </div>
        )}

        {vod && (
          <VerseCardActions
            refLabel={vod.label}
            href={vod.href}
            shareText={vod.text ?? vod.label}
            shareUrl={vod.href}
            book={vod.book}
            bookName={vod.bookName}
            chapter={vod.chapter}
            verse={vod.verse}
            translated={translated ?? undefined}
            listen={{ title: referenceIn(vod.label, vod.book, books), by: t("today.verseOfDay") }}
          />
        )}
      </div>
    </article>
  );
}
