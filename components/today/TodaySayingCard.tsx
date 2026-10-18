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
// It does not link anywhere. There is nowhere honest to send the reader: the
// sayings are a small corpus with no route of their own. A card that reads
// whole and asks nothing is the right shape here, and it matches the voice
// guide's rule to stop when the thought is complete.
//
// Under the Father's name, where the words come from (1.8): the line every
// quotation in the app has (components/citations/SourceLine.tsx). None of
// these sayings is yet traced to a public-domain text, and the line says so.

import type { Saying } from "@/lib/today/saying";
import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { staticShown } from "@/lib/citations/cite";

export function TodaySayingCard({ saying }: { saying: Saying }) {
  const { t } = useTranslate();
  const line = staticShown(saying.cite);
  return (
    <article className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5">
      <p className="font-sans text-caption text-paper/55">
        {t("today.sayingEyebrow")}
      </p>
      <blockquote className="mt-2 font-serif text-ui leading-[1.5] text-paper/85">
        {saying.text}
      </blockquote>
      <p className="mt-2.5 font-sans text-caption text-paper/55">
        {saying.attribution}
      </p>
      {line ? <SourceLine cite={line} className="mt-1" /> : null}
    </article>
  );
}
