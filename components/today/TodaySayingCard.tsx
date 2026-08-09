"use client";

// A saying of the Desert Fathers, shown on the days the saint of the day has
// no profile to open.
//
// Its own card, not a line inside TodaySaintCard, and that is the whole design
// decision. A quotation sitting under a commemorated saint's name reads as that
// saint's words, and inventing or misattributing patristic text is the one
// absolute prohibition in docs/editorial-standards.md. Separate card, own
// heading, Father named on the quotation.
//
// It does not link anywhere. There is nowhere honest to send the reader: the
// sayings are a small public-domain corpus with no route of their own. A card
// that reads whole and asks nothing is the right shape here, and it matches
// the voice guide's rule to stop when the thought is complete.

import type { Saying } from "@/lib/today/saying";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function TodaySayingCard({ saying }: { saying: Saying }) {
  const { t } = useTranslate();
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
    </article>
  );
}
