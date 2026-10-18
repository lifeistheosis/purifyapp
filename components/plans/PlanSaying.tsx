"use client";

// One saying of the Fathers on the day's passage (1.7, the owner's note 22:
// "one saying of the Fathers on the passage (verbatim, public domain,
// cited)"). The words exactly as the public-domain translation prints them
// (data/plans/sayings.json, held to its source by lib/plans/__tests__/
// guide.test.ts), then who, which work, and where: the line every quotation
// in the app has (1.8), which for a work the library holds names the exact
// place and opens it. In English for every reader for now, and a reader in
// another language is told so. A day with no such saying shows nothing here.

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { noteCite } from "@/lib/bible/commentaryWorks";
import type { Saying } from "@/lib/plans/guide";

export function PlanSaying({ saying }: { saying: Saying }) {
  const { t, locale } = useTranslate();
  // Words taken from inside a sentence say so with an ellipsis, outside the
  // quotation itself, which stays exactly as printed.
  const midSentence = /^\p{Ll}/u.test(saying.text);
  return (
    <figure aria-labelledby="plan-saying" data-plan-saying="" className="mt-10 border-t border-paper/10 pt-6">
      <p id="plan-saying" className="font-sans text-caption font-semibold text-paper/55">
        {t("plans.fromTheFathers")}
      </p>
      <blockquote lang="en" className="mt-2 font-serif text-body leading-[1.65] text-paper/90">
        {midSentence ? <span aria-hidden>{"…"}</span> : null}
        {saying.text}
      </blockquote>
      <figcaption className="mt-2">
        <SourceLine cite={noteCite(saying)} />
      </figcaption>
      {locale !== "en" ? <p className="mt-1 font-sans text-caption text-paper/45">{t("content.notYetTranslated.saying")}</p> : null}
    </figure>
  );
}
