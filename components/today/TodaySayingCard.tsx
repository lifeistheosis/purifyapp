"use client";

// A saying of the Desert Fathers, shown on the days the saint of the day has
// no profile to open.
//
// Its own card, not a line in the saint's row, and that is the whole design
// decision. A quotation sitting under a commemorated saint's name reads as that
// saint's words, and inventing or misattributing patristic text is the one
// absolute prohibition in docs/editorial-standards.md. Separate card, own
// heading, Father named on the quotation.
//
// The card itself does not link anywhere: a card that reads whole and asks
// nothing is the right shape here, and it matches the voice guide's rule to
// stop when the thought is complete. Only the source line opens the words
// where they stand.
//
// Under the Father's name, where the words come from (1.8): the line every
// quotation in the app has (components/citations/SourceLine.tsx), written
// into the sayings file with them, which opens the paragraph of the Life of
// Antony or of St John Cassian's Conferences that holds them.
//
// And Share as a picture (1.8, round 3 r3-11, which found this, the quote
// Today shows on most days, was the one that could not be shared): the round
// share mark at the card's corner, as the saint's band carries it, opens the
// picture sheet with the saying's own looks, the Portrait, the Page and the
// Seal (components/share/PictureSheet.tsx), St Antony's face on his.

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { sayingQuote, type Saying } from "@/lib/today/saying";
import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { staticShown } from "@/lib/citations/cite";
import { isNativeClient } from "@/lib/platform/native";
import { quoteFace } from "@/lib/today/saintFaces";

import { ShareMark } from "./SaintWindow";

// Loaded on the tap, as the verse's and the saint's are: Today carries no canvas for a reader who never shares.
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

export function TodaySayingCard({ saying }: { saying: Saying }) {
  const { t, locale } = useTranslate();
  const [making, setMaking] = useState(false);
  const line = saying.shown ?? staticShown(saying.cite);
  // The same objects while the saying is the same: the sheet draws its preview again when they change.
  const words = useMemo(() => ({ text: saying.text, reference: saying.attribution, lang: "en" }), [saying]);
  const quote = useMemo(
    () =>
      making
        ? sayingQuote(saying, {
            head: t("today.sayingEyebrow"),
            face: saying.speaker ? quoteFace({ slug: saying.speaker }, isNativeClient()) : null,
            lang: locale,
          })
        : undefined,
    [making, saying, t, locale],
  );
  const work = line && (line.kind === "father" || line.kind === "text") ? line.work : null;
  return (
    <article className="relative rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5">
      <p className="pe-10 font-sans text-caption text-paper/55">
        {t("today.sayingEyebrow")}
      </p>
      <button
        type="button"
        onClick={() => setMaking(true)}
        aria-label={t("today.verse.shareAsPicture")}
        aria-haspopup="dialog"
        data-saying-share=""
        data-tour="quote-picture"
        className="tap-press hit-44 absolute end-2.5 top-2.5 grid size-[30px] place-items-center rounded-full bg-night/55 text-paper"
      >
        <ShareMark size={15} />
      </button>
      <blockquote className="mt-2 font-serif text-ui leading-[1.5] text-paper/85">
        {saying.text}
      </blockquote>
      <p className="mt-2.5 font-sans text-caption text-paper/55">
        {saying.attribution}
      </p>
      {line ? <SourceLine cite={line} className="mt-1" /> : null}
      {making ? (
        <PictureSheet
          open={making}
          onClose={() => setMaking(false)}
          words={words}
          title={saying.attribution}
          name={saying.attribution}
          caption={work ? `${saying.attribution}\n${work}` : saying.attribution}
          referenceLabel={saying.attribution}
          quote={quote}
        />
      ) : null}
    </article>
  );
}
