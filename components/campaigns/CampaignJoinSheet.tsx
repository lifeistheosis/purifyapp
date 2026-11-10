"use client";

import { useState } from "react";

import { TickLines } from "@/components/campaigns/TickLines";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlaceChips } from "@/components/prayers/PlaceChips";
import { Sheet } from "@/components/ui/Sheet";
import { carriedOne, carry, carryForOf, recarry, takeOut, untilFor, type CarryFor, type CarryPick } from "@/lib/campaigns/carried";
import { dropJoin, keepJoin } from "@/lib/campaigns/client";
import { addDays } from "@/lib/campaigns/model";
import { updateCarried, useCarried } from "@/lib/campaigns/useCarried";
import { dayText } from "@/lib/campaigns/words";
import { DEFAULT_PLACES, type PrayPlace } from "@/lib/prayers/commemoration";
import { useRememberedPlaces } from "@/lib/prayers/useCommemoration";
import { todayKey } from "@/lib/rhythm/dayKey";

/**
 * Joining a campaign is "Add to my prayers" (1.9): the prayer wall's own
 * sheet (components/community/AddToPrayersSheet.tsx) with one more choice.
 * The reader ticks the prayers that will carry the name, the reader's whole
 * list's choice to begin with, and for how long (his yes to item 120): until
 * the campaign's last day, a week, or today only.
 *
 * It needs no account. The name and the title go into the reader's prayers
 * on this device (lib/campaigns/carried.ts) and nothing is sent when they
 * pray; signed in, the choice also rides on their own row so it follows them
 * to another device. Opened again on a campaign already carried, it moves it
 * to other prayers or another day, or takes it out.
 */
export function CampaignJoinSheet({
  open,
  pick,
  onClose,
  onDone,
}: {
  open: boolean;
  pick: CarryPick | null;
  onClose: () => void;
  /** What happened, for the page to say. */
  onDone: (message: string) => void;
}) {
  const { t, locale } = useTranslate();
  const list = useCarried();
  const remembered = useRememberedPlaces();
  const today = todayKey();
  const existing = pick ? carriedOne(list, pick.id, today) : null;
  const [placeChoice, setPlaceChoice] = useState<PrayPlace[] | null>(null);
  const [forChoice, setForChoice] = useState<CarryFor | null>(null);
  // Their own choice if already carried, else the reader's whole list's, else the defaults.
  const places: PrayPlace[] = placeChoice ?? existing?.places ?? (remembered.length > 0 ? remembered : [...DEFAULT_PLACES]);
  const carryFor: CarryFor = forChoice ?? (existing ? carryForOf(existing, today) : "whole");

  if (!pick) return null;

  // Only the choices that differ: a campaign on its last day has one, and
  // one that ends within the week has no "a week" of its own.
  const lengths: { id: CarryFor; label: string }[] = [{ id: "whole", label: t("campaigns.joinWhole", { date: dayText(pick.lastDay, locale) }) }];
  if (pick.lastDay > addDays(today, 6)) lengths.push({ id: "week", label: t("campaigns.length.week") });
  if (pick.lastDay > today) lengths.push({ id: "today", label: t("campaigns.joinToday") });
  const chosenFor = lengths.some((l) => l.id === carryFor) ? carryFor : "whole";

  function keep() {
    if (!pick || places.length === 0) return;
    const until = untilFor(chosenFor, pick.lastDay, today);
    updateCarried((all) => (existing ? recarry(all, pick.id, places, until) : carry(all, pick, places, until, today)));
    void keepJoin(pick.id, places, until < pick.lastDay ? until : null);
    onDone(t("community.wallAdded"));
  }

  function leave() {
    if (!pick) return;
    updateCarried((all) => takeOut(all, pick.id));
    void dropJoin(pick.id);
    onDone(t("community.wallTakenOut"));
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("community.wallAdd")} desktop openFull>
      <div data-campaign-join="" className="pb-1 pt-1">
        <p className="break-words font-serif text-lede text-paper">{pick.name}</p>
        <p className="mt-1 break-words font-sans text-detail leading-relaxed text-paper/70">{pick.title}</p>

        <p id="campaign-join-where" className="mt-5 font-sans text-detail font-semibold text-paper/80">
          {t("community.wallAddWhen")}
        </p>
        <div className="mt-3">
          <PlaceChips value={places} onChange={setPlaceChoice} labelledBy="campaign-join-where" />
        </div>

        {lengths.length > 1 ? (
          <>
            <p id="campaign-join-for" className="mt-5 font-sans text-detail font-semibold text-paper/80">
              {t("campaigns.joinFor")}
            </p>
            <div className="mt-3">
              <TickLines value={chosenFor} options={lengths} onChange={setForChoice} labelledBy="campaign-join-for" />
            </div>
          </>
        ) : null}

        <p className="mt-4 font-sans text-caption leading-relaxed text-paper/70">{t("campaigns.joinNote")}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={keep}
            disabled={places.length === 0}
            className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-40"
          >
            {existing ? t("common.save") : t("community.wallAdd")}
          </button>
          {existing ? (
            <button
              type="button"
              onClick={leave}
              className="inline-flex min-h-11 items-center rounded-pill border border-paper/25 px-5 font-sans text-detail font-semibold text-paper/85 transition-colors hover:border-paper/45"
            >
              {t("community.wallTakeOut")}
            </button>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
