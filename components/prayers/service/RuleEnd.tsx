"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Lampada } from "@/components/ui/icons/Lampada";

/**
 * The end of a rule (1.9, build 93 note 14, his words: "instead of just a
 * generic amen button, make it so that when you scroll past the bottom, it
 * creates like an animation ... for when they complete the prayers").
 *
 * Reaching the end is what completes the rule: the last prayer carried past
 * the reading place, as every prayer before it is counted
 * (./usePassedSteps.ts). There is no Amen button to press. When the rule
 * becomes complete during the visit, the end answers once (`moment`): the
 * click in the hand the completion already gives, the lampada's soft pool of
 * the palette's own light growing to rest as its line brightens, "Glory to
 * God. The rule is complete for today." settling in, then Reset. Nothing
 * moves after it, nothing loops, the pool does not breathe: no rays, no
 * sparkle, no burst (CLAUDE.md). A rule already complete when the page opens
 * shows the same end at rest, with no moment: it was said once. With motion
 * off it is all simply there (globals.css, "The end of a rule").
 *
 * The end keeps its height from the first paint, so nothing under it moves
 * when its words come; on Light and on a look there is no pool (paper cannot
 * glow, and a look's picture is its sign), the lampada's line alone.
 */
export function RuleEnd({
  complete,
  moment,
  wallLeft,
  onReset,
  resetDisabled,
}: {
  /** Every prayer of the rule kept for today. */
  complete: boolean;
  /** The rule became complete during this visit: the end answers once. */
  moment: boolean;
  /** The line said where the names from the prayer wall were let go, when they were. */
  wallLeft: string | null;
  onReset: () => void;
  resetDisabled: boolean;
}) {
  const { t } = useTranslate();
  return (
    <div
      data-rule-end=""
      data-moment={moment ? "" : undefined}
      className="mt-4 flex min-h-[15rem] flex-col items-center gap-3 border-t border-paper/10 pt-8 text-center"
    >
      {complete ? (
        <>
          <div aria-hidden className="rule-complete-lamp">
            <div className="rule-complete-pool" />
            <Lampada size={32} />
          </div>
          <p role="status" data-rule-complete-words="" className="font-serif text-body italic leading-[1.6] text-paper/80">
            {t("prayers.reader.complete")}
          </p>
          <div data-rule-complete-after="" className="flex flex-col items-center gap-3">
            {wallLeft ? <p className="font-sans text-caption text-paper/55">{wallLeft}</p> : null}
            <button
              type="button"
              onClick={onReset}
              disabled={resetDisabled}
              className="tap-press inline-flex min-h-11 items-center px-3 font-sans text-caption text-paper/55 hover:text-paper disabled:opacity-40"
            >
              {t("prayers.rope.reset")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
