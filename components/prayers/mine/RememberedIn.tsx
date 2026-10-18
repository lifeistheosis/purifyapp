"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlaceChips } from "@/components/prayers/PlaceChips";
import { useRememberedPlaces, writeRememberedPlaces } from "@/lib/prayers/useCommemoration";

/**
 * Which prayers carry "Those I pray for" (1.7.1, lib/prayers/commemoration.ts):
 * the reader's own names, living and departed, and anyone they add from the
 * prayer wall, remembered before the dismissal of each prayer chosen here.
 * Above the names on the page of Your rule, kept on this device.
 */
export function RememberedIn() {
  const { t } = useTranslate();
  const places = useRememberedPlaces();
  return (
    <div className="mt-6">
      <p id="remembered-in" className="font-sans text-detail font-semibold text-paper/80">
        {t("community.wallAddWhen")}
      </p>
      <p className="mt-1 max-w-[60ch] font-sans text-caption leading-[1.6] text-paper/55">{t("prayers.commemorate.whereHint")}</p>
      <div className="mt-3">
        <PlaceChips value={places} onChange={writeRememberedPlaces} labelledBy="remembered-in" />
      </div>
    </div>
  );
}
