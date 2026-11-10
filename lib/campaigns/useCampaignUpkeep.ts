"use client";

// Keeping the campaigns a reader carries true to the world (1.9), from the
// screens where they are seen: Pray together, the page of Your rule, a
// campaign's own page. Never from the prayer reader, which reads the device's
// list and asks nobody, so a campaign is prayed with no signal.
//
//   1. What the calendar has changed is written down: those whose day has
//      passed are kept as left (./useCarried.ts, keepExpiry).
//   2. The server is asked where the rest stand, by id (./client.ts,
//      fetchStates): one its creator closed or a moderator took down is let
//      go of.
//   3. Signed in, what the account carries and this device has never seen is
//      brought over (mergeCarried), which is how a choice made on a phone
//      reaches a tablet.
//
// At most once every few hours a device, and only in a build that has
// campaigns and for a reader they are open for.

import { useEffect } from "react";

import { cleanPlaces } from "@/lib/prayers/commemoration";
import { todayKey } from "@/lib/rhythm/dayKey";

import { idsToSettle, mergeCarried, settleCarried, type CarryPick } from "./carried";
import { fetchMine, fetchStates } from "./client";
import { campaignsInBuild } from "./flags";
import { campaignPrayer, isDay } from "./model";
import { keepExpiry, readCarried, updateCarried } from "./useCarried";

const ASKED_KEY = "purify.prayers.campaigns.asked";
const EVERY_MS = 3 * 60 * 60 * 1000;

function due(now: number): boolean {
  try {
    const at = Number(window.localStorage.getItem(ASKED_KEY));
    return !Number.isFinite(at) || at <= 0 || now - at >= EVERY_MS;
  } catch {
    return true;
  }
}

function mark(now: number): void {
  try {
    window.localStorage.setItem(ASKED_KEY, String(now));
  } catch {
    // Private mode: it is asked again next time, which is harmless.
  }
}

/** Run the upkeep now. Exported for the page that has just changed something and wants the truth at once. */
export async function campaignUpkeep(force = false): Promise<void> {
  if (typeof window === "undefined" || !campaignsInBuild()) return;
  keepExpiry();
  const now = Date.now();
  if (!force && !due(now)) return;
  mark(now);

  const states = await fetchStates(idsToSettle(readCarried()));
  if (states) updateCarried((list) => settleCarried(list, states));

  const mine = await fetchMine();
  if (mine.state !== "ok" || !mine.signedIn || mine.carried.length === 0) return;
  const today = todayKey();
  const account = mine.carried.flatMap(({ campaign, places, until_on }) => {
    const chosen = cleanPlaces(places) ?? [];
    if (!campaign.subject_name || !isDay(campaign.ends_on) || chosen.length === 0) return [];
    const psalm = campaignPrayer({ rule: campaign.prayer_rule, id: campaign.prayer_id });
    const pick: CarryPick = {
      id: campaign.id,
      name: campaign.subject_name,
      title: campaign.title,
      forWhom: campaign.for_whom,
      prayer: psalm ? { rule: psalm.rule, id: psalm.id } : null,
      lastDay: campaign.ends_on,
    };
    return [{ pick, places: chosen, until: until_on }];
  });
  updateCarried((list) => mergeCarried(list, account, today));
}

/** Run it when `on` (campaigns are open for this reader) and the screen is shown. */
export function useCampaignUpkeep(on: boolean): void {
  useEffect(() => {
    if (!on) return;
    void campaignUpkeep();
  }, [on]);
}
