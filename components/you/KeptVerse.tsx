"use client";

// A verse you kept, on the You tab (1.8): one of the reader's own verses each
// day, set out to be read again, learned by heart or sent to someone. The
// owner, 2026-10-17, of the tab's verses, paragraphs, bookmarks and notes:
// "it just doesn't feel that useful ... the retention is low". A kept verse
// was a number on a tile; now it comes back.
//
// Drawn in the Light (note 71, the owner's pick A of r3-25): the look of the
// Verse of the Day (his pick B of round 10, components/today/
// VerseOfDayView.tsx), the icon's light behind the words, the three-bar
// cross lit over them, "A verse you kept", the verse in the reading serif and
// its reference; and Learn by heart and Share as one bar at its foot, where
// they were two loose pills (his photo of build 86). Learn by heart wears the
// first letters of the verse's first words on tiles, as the exercise sets
// them out.
//
// Which verse: each kept verse in turn, a different one each day
// (lib/you/you.ts, verseForDay), starred or highlighted. Its words are the
// ones kept on the device, or read once from the website and kept
// (lib/saved/verseWords.ts). A tap on the verse opens it in its chapter;
// "Learn by heart" opens Remember the verse for it (./PractiseSheet.tsx); Share
// sends it as a picture, the way Today's verse is sent (lib/share).
//
// Since build 93 note 11 the reader chooses what stands here, and changes it
// whenever they like ("Allow you to switch the learn the verse whenever you
// want. Also allow a learn the quote ... or a custom verse"): a verse, a quote
// from a text the app carries, or their own words (lib/remember/items.ts).
// While nothing is chosen the day picks a kept verse, as before. "Change"
// under the words opens the sheet that chooses (components/learn/
// ChooseSheet.tsx). A quote opens its place in the book and is shared with
// the place it stands at; the reader's own words are named as theirs, link
// nowhere, and are not sent out as a picture in Purify's look. A reader who
// has kept nothing yet is shown the way in, since their own words need no
// kept verse.

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { PlusLock, PlusMark } from "@/components/billing/PlusMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useLearnSheets, useLearnText } from "@/components/learn/LearnSheets";
import { Cross } from "@/components/ui/icons/Cross";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Share } from "@/components/ui/icons/Share";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import type { LearnItem } from "@/lib/remember/items";
import { hintWords, verseKey } from "@/lib/remember/schedule";
import { useLearning } from "@/lib/remember/useLearning";

/** One half of the bar at the verse's foot. */
const HALF =
  "tap-press flex min-h-[50px] flex-1 items-center justify-center gap-[9px] px-3 font-sans text-ui font-semibold text-paper/90 motion-safe:transition-colors active:bg-paper/[0.05] disabled:opacity-50"

/** A word's first letter on a tile of its own, as the exercise sets them out. */
const TILE =
  "inline-grid h-4 min-w-[15px] place-items-center rounded-[4px] bg-paper/[0.08] px-[3px] font-serif text-[10.5px] font-semibold leading-none text-paper ring-1 ring-inset ring-paper/[0.18]";

/** The quiet control under the words: small type, a finger's height. */
const CHANGE = "tap-press hit-44 inline-flex items-center font-sans text-caption font-semibold text-paper/60";

export type KeptVerseRef = { book: string; chapter: number; verse: number; reference: string };

export function KeptVerse({ verse, className }: { verse: KeptVerseRef | null; className?: string }) {
  const { t } = useTranslate();
  const locked = usePlusFeatures() === false;
  const { chosen } = useLearning();
  const learn = useLearnSheets();
  // What the reader chose; with nothing chosen, the day's kept verse.
  const item = useMemo<LearnItem | null>(
    () =>
      chosen ??
      (verse ? { kind: "verse", key: verseKey(verse.book, verse.chapter, verse.verse), book: verse.book, chapter: verse.chapter, verse: verse.verse, label: verse.reference, addedAt: 0 } : null),
    [chosen, verse],
  );
  const { text: words, status } = useLearnText(item);
  const [said, setSaid] = useState<string | null>(null);
  // The first letters of the first two words, "J a" for "Jesus answered".
  const tiles = useMemo(
    () =>
      hintWords(words?.text ?? "")
        .map((w) => w.first)
        .filter(Boolean)
        .slice(0, 2),
    [words?.text],
  );

  const say = (key: string) => {
    setSaid(t(key));
    window.setTimeout(() => setSaid(null), 2200);
  };

  /** The words as a picture, handed to the phone's share sheet. Drawn on the tap. */
  async function share() {
    if (!words || !item || item.kind === "own") return;
    try {
      const [{ renderVerseCard }, { shareImage }, { cardFileName }] = await Promise.all([
        import("@/lib/share/drawVerseCard"),
        import("@/lib/share/shareImage"),
        import("@/lib/share/verseCard"),
      ]);
      // A quote goes out with the place it stands at, as "Who said it" sends one (components/quotes/WhoSaidIt.tsx).
      const where = item.kind === "quote" ? [item.cite.work, item.cite.place].filter(Boolean).join(", ") : "";
      const picture = await renderVerseCard(
        item.kind === "quote" ? { text: words.text, reference: words.name, note: t("whoSaidIt.card.closeNote", { where }) } : { text: words.text, reference: words.name },
      );
      if (!picture) return say("today.verse.couldNotMakePicture");
      const outcome = await shareImage(picture, cardFileName(words.name), item.kind === "quote" ? `${words.text}\n${[words.name, where].filter(Boolean).join(", ")}` : words.name);
      if (outcome === "saved") say("today.verse.pictureSaved");
      if (outcome === "failed") say("today.verse.couldNotMakePicture");
    } catch {
      say("today.verse.couldNotMakePicture");
    }
  }

  // Nothing kept and nothing chosen: the way in, since a quote and the reader's own words need no kept verse.
  if (!item) {
    return (
      <section data-you-verse="empty" aria-labelledby="you-verse-title" className={className}>
        <div className="lm-card relative overflow-hidden rounded-[24px] border border-paper/10 bg-night-deep text-center">
          <span aria-hidden className="verse-light pointer-events-none absolute left-1/2 top-[-120px] h-[300px] w-[380px] -translate-x-1/2" />
          <div className="relative">
            <div className="px-[22px] pb-1 pt-5">
              <span aria-hidden className="verse-cross-lit inline-flex text-paper">
                <Cross size={24} />
              </span>
              <p id="you-verse-title" className="mt-2 flex items-center justify-center gap-2 font-sans text-[12.5px] font-semibold leading-snug text-paper/60">
                {t("you.verse.learn")}
                {locked ? <PlusMark /> : null}
              </p>
            </div>
            {/* The one way in, as the bar at the card's foot. */}
            <div className="you-verse-foot mt-3.5 flex border-t border-paper/[0.08]">
              <button type="button" data-learn-change="" onClick={learn.change} className={HALF}>
                {t("learn.title")}
              </button>
            </div>
          </div>
        </div>
        {learn.sheets}
      </section>
    );
  }

  const href = item.kind === "verse" ? `/bible/${item.book}/${item.chapter}#v${item.verse}` : item.kind === "quote" ? item.cite.href : null;
  const name = words?.name ?? (item.kind === "verse" ? item.label : "");
  // A quote's words and its author are English, as the edition prints them; a verse and the reader's own run as they are written.
  const english = item.kind === "quote" ? ({ lang: "en", dir: "ltr" } as const) : null;
  const inside: ReactNode = (
    <>
      <span aria-hidden className="verse-cross-lit inline-flex text-paper">
        <Cross size={24} />
      </span>
      <span id="you-verse-title" className="mt-2 block font-sans text-[12.5px] font-semibold leading-snug text-paper/60">
        {t(chosen ? "learn.learning" : "you.verse.title")}
      </span>
      {words ? (
        <span className="mt-[11px] line-clamp-6 font-serif text-[18px] leading-[1.47] text-paper" {...(english ?? { dir: "auto" })}>
          {words.text}
        </span>
      ) : (
        <span className="mt-[11px] block font-sans text-detail text-paper/50">{status === "missing" ? t("saved.openToRead") : t("common.loading")}</span>
      )}
      <span className="mt-[11px] inline-flex items-center gap-1 font-sans text-detail font-semibold text-paper/70" {...(english ?? {})}>
        {name}
        {href ? <ChevronLeft size={12} aria-hidden className="-scale-x-100 opacity-60 rtl:scale-x-100" /> : null}
      </span>
      {item.kind === "quote" ? (
        <span lang="en" dir="ltr" className="mt-0.5 block font-sans text-caption text-paper/55">
          {[item.cite.work, item.cite.place].filter(Boolean).join(", ")}
        </span>
      ) : null}
    </>
  );

  return (
    <section data-you-verse={item.kind} aria-labelledby="you-verse-title" className={className}>
      <div className="lm-card relative overflow-hidden rounded-[24px] border border-paper/10 bg-night-deep text-center">
        {/* The icon's light, behind the words. */}
        <span aria-hidden className="verse-light pointer-events-none absolute left-1/2 top-[-120px] h-[300px] w-[380px] -translate-x-1/2" />
        <div className="relative">
          {href ? (
            <Link href={href} className="tap-press block px-[22px] pb-1 pt-5">
              {inside}
            </Link>
          ) : (
            <div className="px-[22px] pb-1 pt-5">{inside}</div>
          )}
          {/* What is learned can be changed at any time. */}
          <p className="mt-1.5">
            <button type="button" data-learn-change="" onClick={learn.change} className={CHANGE}>
              {t("learn.change")}
            </button>
          </p>
          {/* Learn by heart and Share, one bar at the foot. */}
          <div className="you-verse-foot mt-2.5 flex border-t border-paper/[0.08]">
            <button type="button" data-you-learn="" disabled={!words} onClick={() => learn.practise(item)} className={HALF}>
              {tiles.length ? (
                <span aria-hidden className="inline-flex gap-0.5" dir="auto">
                  {tiles.map((letter, i) => (
                    <span key={i} className={TILE}>
                      {letter}
                    </span>
                  ))}
                </span>
              ) : null}
              {t("you.verse.learn")}
              {locked ? <PlusLock size={12} className="text-paper/55" /> : null}
            </button>
            {/* The reader's own words are not sent out as a picture in Purify's look (1.9). */}
            {item.kind !== "own" ? (
              <>
                <span aria-hidden className="my-3 w-px shrink-0 bg-paper/10" />
                <button type="button" data-you-share="" disabled={!words} onClick={() => void share()} className={HALF}>
                  <Share size={18} aria-hidden />
                  {t("common.share")}
                </button>
              </>
            ) : null}
          </div>
          <p role="status" className={cn("px-4 pb-3 font-sans text-caption text-paper/60", !said && "sr-only")}>
            {said ?? ""}
          </p>
        </div>
      </div>
      {learn.sheets}
    </section>
  );
}
