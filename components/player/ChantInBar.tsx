"use client";

import { useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { TOP_ICON, TOP_PLATE } from "@/components/nav/topPlate";
import { Note } from "@/components/ui/icons/Note";
import { chantAtHand, onChantAtHand, openChantAtHand } from "@/lib/player/chantAtHand";
import { haptic } from "@/lib/ui/motion";

/**
 * The chant at hand, in a prayer page's bar (1.9, fresh eyes L1): the button
 * that took the place of the "Pray with chant" pill, which floated over the
 * prayer's words. It comes at the moment the pill came (Pray with gone up
 * off the screen, and nothing sounding; components/player/PrayWith.tsx says
 * when, through lib/player/chantAtHand.ts) and opens the same picker, so the
 * chant is still one tap away at any line.
 *
 * Its place in the bar is kept from the first frame, whether it shows or
 * not: it is always there and only hidden (app/globals.css, ".chant-in-bar"),
 * so its coming moves nothing, not search beside it and not the end of a
 * long name. Hidden, it takes no tap and no focus and is not read out.
 *
 * Drawn as the bar's other round buttons are: the house's 44px plate and a
 * mark at the bar's one weight (components/nav/topPlate.ts), the two beamed
 * notes Pray with's own chant half wears. It stands before search in the
 * row, by `start` and `end`, so in Arabic it stands on search's other side.
 */
export function ChantInBar() {
  const { t } = useTranslate();
  const offered = useSyncExternalStore(onChantAtHand, chantAtHand, () => false);
  return (
    <button
      type="button"
      data-chant-in-bar=""
      data-on={offered ? "" : undefined}
      aria-haspopup="dialog"
      aria-label={t("chant.button")}
      title={t("chant.button")}
      onClick={() => {
        haptic("light");
        openChantAtHand();
      }}
      className={`${TOP_PLATE} chant-in-bar text-paper/70 hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2`}
    >
      <Note {...TOP_ICON} />
    </button>
  );
}
