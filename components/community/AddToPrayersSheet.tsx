"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlaceChips } from "@/components/prayers/PlaceChips";
import { Sheet } from "@/components/ui/Sheet";
import { DEFAULT_PLACES, type PrayPlace } from "@/lib/prayers/commemoration";
import { useRememberedPlaces } from "@/lib/prayers/useCommemoration";
import { updateWallNames, useWallNames } from "@/lib/prayers/useWallNames";
import { activeWallName, addWallName, markWallPrayed, setWallPlaces } from "@/lib/prayers/wallNames";

/** A request on the wall, as the reader saw it: the only thing carried into their prayers. */
export type WallPick = { id: string; name: string; intention: string | null };

/**
 * Add someone from the prayer wall to the reader's own prayers (1.7.1). They
 * are remembered in "Those I pray for" with the reader's own names, in the
 * prayers chosen here: the reader's choice for their whole list to begin
 * with (lib/prayers/commemoration.ts), any of morning, midday and evening
 * prayers, the Hours, Compline and their own rule. The name and the words
 * they asked with go into the reader's prayers on this device
 * (lib/prayers/wallNames.ts), and nothing else of theirs. Opened again on
 * someone already added, it moves them to other prayers or takes them out.
 */
export function AddToPrayersSheet({
  open,
  pick,
  onClose,
  onDone,
}: {
  open: boolean;
  pick: WallPick | null;
  onClose: () => void;
  /** What happened, for the wall to say. */
  onDone: (message: string) => void;
}) {
  const { t } = useTranslate();
  const list = useWallNames();
  const remembered = useRememberedPlaces();
  const existing = pick ? activeWallName(list, pick.id) : null;
  const [choice, setChoice] = useState<PrayPlace[] | null>(null);
  // Their own prayers if already added, else the reader's whole list's, else the defaults.
  const chosen: PrayPlace[] = choice ?? existing?.places ?? (remembered.length > 0 ? remembered : [...DEFAULT_PLACES]);

  function keep() {
    if (!pick || chosen.length === 0) return;
    updateWallNames((names) => (existing ? setWallPlaces(names, pick.id, chosen) : addWallName(names, pick, chosen)));
    onDone(t("community.wallAdded"));
  }

  function takeOut() {
    if (!pick) return;
    updateWallNames((names) => markWallPrayed(names, [pick.id]));
    onDone(t("community.wallTakenOut"));
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("community.wallAdd")} desktop openFull>
      {pick ? (
        <div className="pb-1 pt-1">
          <p className="break-words font-serif text-lede text-paper">{pick.name}</p>
          {pick.intention ? (
            <p className="mt-1 break-words font-sans text-detail leading-relaxed text-paper/70">{pick.intention}</p>
          ) : null}

          <p id="wall-for-label" className="mt-5 font-sans text-detail font-semibold text-paper/80">
            {t("community.wallAddWhen")}
          </p>
          <div className="mt-3">
            <PlaceChips value={chosen} onChange={setChoice} labelledBy="wall-for-label" />
          </div>

          <p className="mt-4 font-sans text-caption leading-relaxed text-paper/55">{t("community.wallAddNote")}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={keep}
              disabled={chosen.length === 0}
              className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-40"
            >
              {existing ? t("common.save") : t("community.wallAdd")}
            </button>
            {existing ? (
              <button
                type="button"
                onClick={takeOut}
                className="inline-flex min-h-11 items-center rounded-pill border border-paper/25 px-5 font-sans text-detail font-semibold text-paper/85 transition-colors hover:border-paper/45"
              >
                {t("community.wallTakeOut")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
