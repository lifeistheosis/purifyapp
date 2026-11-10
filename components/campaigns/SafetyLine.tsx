"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { HELPLINES_SITE, HELPLINES_URL } from "@/lib/campaigns/safety";
import { cn } from "@/lib/cn";

/**
 * The safety line (1.9; his item 129, answered 2026-11-10): where a reader
 * in danger, or a reader who fears for someone, can turn at once. The words
 * are the ones he approved, with the numbers and the site each checked on
 * its own page that day (the notes, section 29), and they say nothing of
 * doctrine.
 *
 * Two ways it is drawn:
 *
 *   always      a quiet line at the foot of the rules page and of the start
 *               screen, for anyone who reads that far;
 *   `first`     at once, to the writer of words that may mean danger: "A
 *               moderator will read your words first." over the same line,
 *               set apart so that it is seen.
 *
 * The site's name is the one place to tap: it opens the list of helplines
 * by country. The numbers are words and not buttons, so that nobody calls an
 * emergency line by a slip of the thumb.
 */
export function SafetyLine({ first = false, className }: { first?: boolean; className?: string }) {
  const { t } = useTranslate();
  const line = t("campaigns.safety.line");
  // The site stands in every language's line by its own name; where a line
  // has lost it, the line is shown as it is and nothing is made up.
  const at = line.indexOf(HELPLINES_SITE);
  const words =
    at < 0 ? (
      line
    ) : (
      <>
        {line.slice(0, at)}
        <a href={HELPLINES_URL} target="_blank" rel="noopener noreferrer" className="hit-44 font-semibold text-paper underline underline-offset-4">
          {HELPLINES_SITE}
        </a>
        {line.slice(at + HELPLINES_SITE.length)}
      </>
    );
  if (!first) {
    return (
      <p data-campaign-safety="" className={cn("font-sans text-caption leading-relaxed text-paper/70", className)}>
        {words}
      </p>
    );
  }
  return (
    <div data-campaign-safety="first" role="status" className={cn("rounded-[14px] border border-paper/20 bg-paper/[0.05] p-4", className)}>
      <p className="font-sans text-ui font-semibold leading-snug text-paper">{t("campaigns.safety.first")}</p>
      <p className="mt-2 font-sans text-detail leading-relaxed text-paper/85">{words}</p>
    </div>
  );
}
