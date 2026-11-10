"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlaceChips } from "@/components/prayers/PlaceChips";
import { Sheet } from "@/components/ui/Sheet";
import { Orans } from "@/components/ui/icons/Orans";
import { PLACE_LABEL } from "@/lib/prayers/commemoration";
import { useRememberedPlaces, writeRememberedPlaces } from "@/lib/prayers/useCommemoration";

import { WayPlate, WayRow } from "./WayRow";

/**
 * Which prayers carry "Those I pray for" (1.7.1, lib/prayers/commemoration.ts):
 * the reader's own names, living and departed, and anyone they add from the
 * prayer wall, remembered before the dismissal of each prayer chosen here.
 * Above the names on the page of Your rule, kept on this device.
 *
 * 1.8 (the owner's pick A of r3-27): one row, In which prayers, saying the
 * prayers chosen, that opens a sheet of them to tick (PlaceChips); it was
 * six pills on the page. From build 89 note 14 it is the same row as Add
 * prayers one by one (WayRow), not a second drawing of it.
 */
export function RememberedIn() {
  const { t, locale } = useTranslate();
  const places = useRememberedPlaces();
  const [open, setOpen] = useState(false);
  const names = places.map((p) => t(PLACE_LABEL[p]));
  let chosen = t("prayers.commemorate.nowhere");
  if (names.length) {
    try {
      chosen = new Intl.ListFormat(locale, { style: "short", type: "unit" }).format(names);
    } catch {
      chosen = names.join(", ");
    }
  }
  return (
    <>
      <div className="set-panel mt-4">
        <WayRow
          lead={
            <WayPlate>
              <Orans size={17} />
            </WayPlate>
          }
          label={t("community.wallAddWhen")}
          desc={chosen}
          onClick={() => setOpen(true)}
          opensSheet
          oneLine
          data={{ "data-remembered-in": "" }}
        />
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("community.wallAddWhen")} desktop>
        <p id="remembered-in" className="font-sans text-caption leading-[1.6] text-paper/60">
          {t("prayers.commemorate.whereHint")}
        </p>
        <div className="mt-4">
          <PlaceChips value={places} onChange={writeRememberedPlaces} labelledBy="remembered-in" />
        </div>
      </Sheet>
    </>
  );
}
