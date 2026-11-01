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

import Link from "next/link";
import { useMemo, useState } from "react";

import { PlusLock } from "@/components/billing/PlusMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Cross } from "@/components/ui/icons/Cross";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Share } from "@/components/ui/icons/Share";
import { PractiseSheet } from "@/components/you/PractiseSheet";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { hintWords } from "@/lib/remember/schedule";
import { useVerseWords } from "@/lib/saved/verseWords";

/** One half of the bar at the verse's foot. */
const HALF =
  "tap-press flex min-h-[50px] flex-1 items-center justify-center gap-[9px] px-3 font-sans text-ui font-semibold text-paper/90 motion-safe:transition-colors active:bg-paper/[0.05] disabled:opacity-50";

/** A word's first letter on a tile of its own, as the exercise sets them out. */
const TILE =
  "inline-grid h-4 min-w-[15px] place-items-center rounded-[4px] bg-paper/[0.08] px-[3px] font-serif text-[10.5px] font-semibold leading-none text-paper ring-1 ring-inset ring-paper/[0.18]";

export type KeptVerseRef = { book: string; chapter: number; verse: number; reference: string };

export function KeptVerse({ verse, className }: { verse: KeptVerseRef; className?: string }) {
  const { t } = useTranslate();
  const locked = usePlusFeatures() === false;
  const words = useVerseWords(verse.book, verse.chapter, verse.verse, true);
  const [practise, setPractise] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const href = `/bible/${verse.book}/${verse.chapter}#v${verse.verse}`;
  // The first letters of the verse's first two words, "J a" for "Jesus answered".
  const tiles = useMemo(
    () =>
      hintWords(words.text ?? "")
        .map((w) => w.first)
        .filter(Boolean)
        .slice(0, 2),
    [words.text],
  );

  const say = (key: string) => {
    setSaid(t(key));
    window.setTimeout(() => setSaid(null), 2200);
  };

  /** The verse as a picture, handed to the phone's share sheet. Drawn on the tap. */
  async function share() {
    if (!words.text) return;
    try {
      const [{ renderVerseCard }, { shareImage }, { cardFileName }] = await Promise.all([
        import("@/lib/share/drawVerseCard"),
        import("@/lib/share/shareImage"),
        import("@/lib/share/verseCard"),
      ]);
      const picture = await renderVerseCard({ text: words.text, reference: verse.reference });
      if (!picture) return say("today.verse.couldNotMakePicture");
      const outcome = await shareImage(picture, cardFileName(verse.reference), verse.reference);
      if (outcome === "saved") say("today.verse.pictureSaved");
      if (outcome === "failed") say("today.verse.couldNotMakePicture");
    } catch {
      say("today.verse.couldNotMakePicture");
    }
  }

  return (
    <section data-you-verse="" aria-labelledby="you-verse-title" className={className}>
      <div className="lm-card relative overflow-hidden rounded-[24px] border border-paper/10 bg-night-deep text-center">
        {/* The icon's light, behind the words. */}
        <span aria-hidden className="verse-light pointer-events-none absolute left-1/2 top-[-120px] h-[300px] w-[380px] -translate-x-1/2" />
        <div className="relative">
          <Link href={href} className="tap-press block px-[22px] pb-1 pt-5">
            <span aria-hidden className="verse-cross-lit inline-flex text-paper">
              <Cross size={24} />
            </span>
            <span id="you-verse-title" className="mt-2 block font-sans text-[12.5px] font-semibold leading-snug text-paper/60">
              {t("you.verse.title")}
            </span>
            {words.text ? (
              <span className="mt-[11px] line-clamp-6 font-serif text-[18px] leading-[1.47] text-paper" dir="auto">
                {words.text}
              </span>
            ) : (
              <span className="mt-[11px] block font-sans text-detail text-paper/50">{words.status === "missing" ? t("saved.openToRead") : t("common.loading")}</span>
            )}
            <span className="mt-[11px] inline-flex items-center gap-1 font-sans text-detail font-semibold text-paper/70">
              {verse.reference}
              <ChevronLeft size={12} aria-hidden className="-scale-x-100 opacity-60 rtl:scale-x-100" />
            </span>
          </Link>
          {/* Learn by heart and Share, one bar at the verse's foot. */}
          <div className="you-verse-foot mt-3.5 flex border-t border-paper/[0.08]">
            <button type="button" data-you-learn="" disabled={!words.text} onClick={() => setPractise(true)} className={HALF}>
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
            <span aria-hidden className="my-3 w-px shrink-0 bg-paper/10" />
            <button type="button" data-you-share="" disabled={!words.text} onClick={() => void share()} className={HALF}>
              <Share size={18} aria-hidden />
              {t("common.share")}
            </button>
          </div>
          <p role="status" className={cn("px-4 pb-3 font-sans text-caption text-paper/60", !said && "sr-only")}>
            {said ?? ""}
          </p>
        </div>
      </div>
      <PractiseSheet
        open={practise}
        onClose={() => setPractise(false)}
        verse={words.text ? { ...verse, text: words.text } : null}
      />
    </section>
  );
}
