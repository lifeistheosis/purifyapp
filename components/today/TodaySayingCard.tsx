"use client";

// A saying of the Desert Fathers, shown on the days the saint of the day has
// no profile to open.
//
// Its own band, not a line in the saint's, and that is the whole design
// decision. A quotation sitting under a commemorated saint's name reads as that
// saint's words, and inventing or misattributing patristic text is the one
// absolute prohibition in docs/editorial-standards.md. Separate band, own
// heading, Father named on the quotation.
//
// The band itself does not link anywhere: a card that reads whole and asks
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
// share mark at the band's corner opens the picture sheet with the saying's
// own looks, the Portrait, the Page and the Seal
// (components/share/PictureSheet.tsx).
//
// Since round 3 r3-21 (the owner's pick A, "The face beside the words") the
// Father stands beside his saying, as the day's saint stands beside his words
// (components/today/SpeakerBand.tsx): St Antony's cover from the reading room
// beside his, and the lit cross where a Father with no face we may show would
// stand, Abba Moses and Abba Isaac among them, never a stand-in. Who stands
// beside which saying is one small map, lib/today/saintFaces.ts SAYING_FACES,
// so an icon checked later for Abba Moses, or one of the desert Fathers
// together, is one entry there; the picture of the saying shares the same face.

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { sayingQuote, type Saying } from "@/lib/today/saying";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { staticShown } from "@/lib/citations/cite";
import { isNativeClient } from "@/lib/platform/native";
import { sayingFace } from "@/lib/today/saintFaces";

import { SpeakerBand } from "./SpeakerBand";

// Loaded on the tap, as the verse's and the saint's are: Today carries no canvas for a reader who never shares.
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

export function TodaySayingCard({ saying }: { saying: Saying }) {
  const { t, locale } = useTranslate();
  const [making, setMaking] = useState(false);
  const line = saying.shown ?? staticShown(saying.cite);
  const face = useMemo(() => sayingFace(saying, isNativeClient()), [saying]);
  // The same objects while the saying is the same: the sheet draws its preview again when they change.
  const words = useMemo(() => ({ text: saying.text, reference: saying.attribution, lang: "en" }), [saying]);
  const quote = useMemo(
    () => (making ? sayingQuote(saying, { head: t("today.sayingEyebrow"), face, lang: locale }) : undefined),
    [making, saying, face, t, locale],
  );
  const work = line && (line.kind === "father" || line.kind === "text") ? line.work : null;
  return (
    <>
      <SpeakerBand
        data-today-saying=""
        data-tour="quote-picture"
        eyebrow={t("today.sayingEyebrow")}
        words={saying.text}
        who={saying.attribution}
        cite={line}
        face={face}
        onShare={() => setMaking(true)}
        shareMark="data-saying-share"
      />
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
    </>
  );
}
