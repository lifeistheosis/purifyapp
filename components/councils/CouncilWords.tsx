"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { Share } from "@/components/ui/icons/Share";
import type { ShownCite } from "@/lib/citations/cite";
import type { QuoteSubject } from "@/lib/share/verseCard";

// Loaded on the tap: a council's page carries no canvas for a reader who never shares.
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/** The marks the line is set in, by their codes: the councils' files hold no curly quote as a character (lib/councils/__tests__/pages.test.ts). */
const OPEN = String.fromCharCode(0x201c);
const CLOSE = String.fromCharCode(0x201d);

/**
 * The council in its own words (1.8, round 3 r3-11, which found that "a
 * council's words cannot be made a picture at all"): one line of its own
 * document (lib/councils/lines.ts), large, with the line every quotation
 * wears under it, then the two actions a quoted line has everywhere in the
 * app: Share as a picture, which opens the picture sheet on the council's own
 * layouts and looks with its picture (components/share/PictureSheet.tsx), and
 * Read where it's from, the document at that section.
 *
 * Its subject is made on the server; only the running head of the Page
 * ("The Ecumenical Councils", "Local Council") is the reader's language,
 * looked up here.
 */
export function CouncilWords({
  text,
  shown,
  subject,
  pageHeadKey,
  name,
}: {
  /** The line, word for word. */
  text: string;
  shown: ShownCite;
  subject: QuoteSubject;
  pageHeadKey: string;
  /** The council's name, the sheet's title and the picture's file. */
  name: string;
}) {
  const { t, locale } = useTranslate();
  const [making, setMaking] = useState(false);
  const where = shown.kind === "father" ? shown.href : null;
  // The same objects while they are the same: the sheet draws its preview again when they change.
  const words = useMemo(() => ({ text, reference: name, lang: "en" }), [text, name]);
  const quote = useMemo(() => (making ? { ...subject, pageHead: t(pageHeadKey), lang: locale } : undefined), [making, subject, t, pageHeadKey, locale]);
  const work = shown.kind === "father" ? shown.work : null;
  return (
    <section aria-labelledby="council-words" data-council-words="" className="mt-8 rounded-[18px] border border-paper/8 bg-paper/[0.03] px-4 pb-4 pt-3.5">
      <h2 id="council-words" className="font-sans text-caption font-semibold text-paper/55">
        {t("study.heresies.inTheirWords")}
      </h2>
      <blockquote lang="en" className="mt-2.5 font-heading text-title-sm italic leading-[1.42] text-paper">
        {`${OPEN}${text}${CLOSE}`}
      </blockquote>
      <SourceLine cite={shown} className="mt-2.5" />
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => setMaking(true)}
          aria-haspopup="dialog"
          data-council-share=""
          className="tap-press flex min-h-13 flex-1 items-center justify-center gap-2.5 rounded-pill bg-paper px-5 font-sans text-[15px] font-semibold text-night"
        >
          <Share size={18} />
          {t("today.verse.shareAsPicture")}
        </button>
        {where ? (
          <Link
            href={where}
            data-council-source=""
            className="tap-press flex min-h-13 flex-1 items-center justify-center gap-2.5 rounded-pill border border-paper/22 px-5 font-sans text-[15px] font-semibold text-paper"
          >
            <Book size={18} />
            {t("today.saintWords.readSource")}
          </Link>
        ) : null}
      </div>
      {making ? (
        <PictureSheet
          open={making}
          onClose={() => setMaking(false)}
          words={words}
          title={name}
          name={name}
          caption={work ? `${name}\n${work}` : name}
          referenceLabel={name}
          quote={quote}
        />
      ) : null}
    </section>
  );
}
