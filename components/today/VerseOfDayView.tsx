"use client";

import { useState } from "react";
import Link from "next/link";
import { Reference } from "@/components/bible/Reference";
import { useTranslate } from "@/components/i18n/MessagesProvider";
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

/**
 * The Verse of the Day card itself. Client-side so it can read the
 * reader's own calendar day; the verse TEXT still comes from the server
 * (or, on Android, from the build), because it is loaded out of
 * data/bible through `server-only` code that cannot run on a device.
 *
 * `table` is a date-keyed window produced by the parent. See
 * lib/today/verseOfDay.ts for why it is a window rather than one entry.
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
  const Label = headingId ? "h2" : "span";

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
    <article
      className="lm-card relative overflow-hidden rounded-[28px] border border-paper/10 p-6 pt-5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)]"
      style={{
        background:
          "radial-gradient(120% 85% at 85% 8%, rgba(255,255,255,0.10) 0%, transparent 52%), linear-gradient(165deg, #26262b 0%, #1a1a1d 52%, #101013 100%)",
      }}
    >
      <div className="relative">
        {/* Eyebrow row: label + a small owned three-bar cross anchoring
            this as the day's word, with the kind chip on the right. */}
        <div className="flex items-center justify-between gap-3">
          {/* The inline font is not a style preference: globals.css sets
              h1..h6 to Lora 700 UNLAYERED, which beats any font-* utility,
              so an <h2 className="font-sans"> would still render as bold
              Lora and this 11px uppercase label would change face the
              moment it became a heading. */}
          <Label
            id={headingId}
            style={
              headingId
                ? { fontFamily: "var(--font-sans)", fontWeight: 600 }
                : undefined
            }
            className="inline-flex items-center gap-2 font-sans text-caption font-semibold text-gold/80"
          >
            <ThreeBarCross />
            <T k="today.verseOfDay" />
          </Label>
          {vod && vod.source !== "rotation" && vod.source !== "related" && !stale && (
            <span className="shrink-0 inline-flex items-center rounded-full border border-paper/15 bg-paper/[0.05] px-2.5 py-[2px] font-sans text-caption font-semibold text-paper/60">
              {vod.source === "gospel" ? (
                <T k="bible.kindGospel" />
              ) : vod.source === "epistle" ? (
                <T k="bible.kindEpistle" />
              ) : (
                <T k="bible.kindOt" />
              )}
            </span>
          )}
        </div>

        {/* The reference and the verse open the chapter, and the verse shows
            four lines at most: the owner's marks of 2026-10-07 ("the verse
            card shows a few lines and opens to the rest") in the Today he
            picked on 2026-10-15. Before 1.7 a tap on the card did nothing,
            so the chapter was two taps away, through the menu. */}
        <Link href={vod?.href ?? "/bible"} className="tap-press mt-3 block">
          {/* The book in the reader's language, as the day's readings are
              (1.7: once the card became a link, the walk's Greek phone
              found "Luke 13:34" among the Greek references). */}
          <p className="font-sans text-detail font-semibold tracking-[0.01em] text-paper/80">
            {vod ? <Reference>{referenceIn(vod.label, vod.book, books)}</Reference> : " "}
            {/* Which Bible the words are from (1.8), quietly, after the reference. */}
            {vod ? (
              <span className="font-normal text-paper/50">
                {edition}
              </span>
            ) : null}
          </p>

          <div
            lang={machine ? (translated ? machine.language : "en") : undefined}
            className="mt-2 line-clamp-4 font-serif text-title-sm leading-[1.32] text-paper/95"
          >
            {translated ? translated.text : vod?.text ?? (
              <span className="text-paper/45 italic">
                <T k="today.loadingVerse" />
              </span>
            )}
          </div>
        </Link>

        {/* The label sits outside the link and outside the four-line clamp,
            so no verse is long enough to push it out of sight. */}
        {machine && (
          <div lang={machine.language} className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
          />
        )}
      </div>
    </article>
  );
}

function ThreeBarCross() {
  return (
    <svg
      width={11}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className="shrink-0"
      aria-hidden
    >
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      <line x1="8.5" y1="6" x2="15.5" y2="6" />
      <line x1="5.5" y1="9.5" x2="18.5" y2="9.5" />
      <line x1="8" y1="16.5" x2="16" y2="14" />
    </svg>
  );
}
