"use client";

// A verse you kept, on the You tab (1.8): one of the reader's own verses each
// day, set out to be read again, learned by heart or sent to someone. The
// owner, 2026-10-17, of the tab's verses, paragraphs, bookmarks and notes:
// "it just doesn't feel that useful ... the retention is low". A kept verse
// was a number on a tile; now it comes back.
//
// Which verse: each kept verse in turn, a different one each day
// (lib/you/you.ts, verseForDay), starred or highlighted. Its words are the
// ones kept on the device, or read once from the website and kept
// (lib/saved/verseWords.ts). A tap on the verse opens it in its chapter;
// "Learn by heart" opens Remember the verse for it (./PractiseSheet.tsx); Share
// sends it as a picture, the way Today's verse is sent (lib/share).

import Link from "next/link";
import { useState } from "react";

import { PlusLock } from "@/components/billing/PlusMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { PractiseSheet } from "@/components/you/PractiseSheet";
import { YouSection } from "@/components/you/YouList";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { useVerseWords } from "@/lib/saved/verseWords";

const PILL =
  "tap-press inline-flex h-11 items-center gap-1.5 rounded-pill border border-paper/15 px-4 font-sans text-caption font-semibold text-paper/85 motion-safe:transition-colors active:bg-paper/[0.06] disabled:opacity-50";

export type KeptVerseRef = { book: string; chapter: number; verse: number; reference: string };

export function KeptVerse({ verse, className }: { verse: KeptVerseRef; className?: string }) {
  const { t } = useTranslate();
  const locked = usePlusFeatures() === false;
  const words = useVerseWords(verse.book, verse.chapter, verse.verse, true);
  const [practise, setPractise] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const href = `/bible/${verse.book}/${verse.chapter}#v${verse.verse}`;

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
    <YouSection title={t("you.verse.title")} className={className} data-you-verse="">
      <div className={INDEX_LIST_LOOK}>
        <Link href={href} className="block px-4 pb-3 pt-4 motion-safe:transition-colors active:bg-paper/[0.04]">
          {words.text ? (
            <p className="line-clamp-6 font-serif text-lede leading-[1.5] text-paper" dir="auto">
              {words.text}
            </p>
          ) : (
            <p className="font-sans text-detail text-paper/50">{words.status === "missing" ? t("saved.openToRead") : t("common.loading")}</p>
          )}
          <p className="mt-2 inline-flex items-center gap-1 font-sans text-caption font-semibold text-paper/60">
            {verse.reference}
            <ChevronLeft size={12} className="-scale-x-100 rtl:scale-x-100" />
          </p>
        </Link>
        <div className="flex flex-wrap items-center gap-2 border-t border-paper/[0.06] px-3 py-2.5">
          <button type="button" disabled={!words.text} onClick={() => setPractise(true)} className={PILL}>
            {t("you.verse.learn")}
            {locked ? <PlusLock size={12} className="text-paper/55" /> : null}
          </button>
          <button type="button" disabled={!words.text} onClick={() => void share()} className={PILL}>
            {t("common.share")}
          </button>
          <p role="status" className={cn("ms-auto px-1 font-sans text-caption text-paper/60", !said && "sr-only")}>
            {said ?? ""}
          </p>
        </div>
      </div>
      <PractiseSheet
        open={practise}
        onClose={() => setPractise(false)}
        verse={words.text ? { ...verse, text: words.text } : null}
      />
    </YouSection>
  );
}
