"use client";

// "Take the tour", on What's New (1.8, the owner's note 49 of build 80): the
// release's guided tour, again or for the first time, from wherever the
// reader is. The end card of the tour says this is where it lives.
//
// Being on What's New is seeing the update, so this marks the release's tour
// seen (lib/whatsNew/tourState.ts): a reader who comes here before Today is
// not offered the pop-up after it, as two update screens. A release with no
// tour draws nothing.

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Lampada } from "@/components/ui/icons/Lampada";
import { tourFor } from "@/lib/whatsNew/tour";
import { writeTourMark } from "@/lib/whatsNew/tourState";
import { startTour } from "@/lib/whatsNew/tourStore";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

export function TakeTheTour() {
  const { t } = useTranslate();
  const pathname = usePathname() ?? "/whats-new";
  const tour = tourFor(CURRENT_VERSION);

  useEffect(() => {
    if (tour) writeTourMark(tour.version, "seen");
  }, [tour]);

  if (!tour) return null;
  return (
    <button
      type="button"
      data-tour-replay=""
      onClick={() => startTour(tour.version, { route: pathname, via: "replay" })}
      className="tap-press group flex w-full items-center gap-4 rounded-[20px] border border-paper/12 bg-paper/[0.03] px-4 py-3.5 text-start transition-colors hover:border-paper/25 hover:bg-paper/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
    >
      <span aria-hidden className="tour-mark">
        <Lampada size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-ui font-semibold text-paper">{t("tour.replay")}</span>
        <span className="mt-0.5 block font-sans text-caption text-paper/55">{t(tour.name)}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-paper/50 transition-colors group-hover:text-paper rtl:-scale-x-100" />
    </button>
  );
}
