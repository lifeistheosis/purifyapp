"use client";

// Are prayer campaigns open for this reader? The one answer every door to
// campaigns waits for (Pray together's section, You's rows, the menu).
//
// A closed build (./flags.ts) answers no at once and asks nobody. Any other
// build asks the server once a page load (app/api/campaigns/open): the
// server's own switch decides, so an app follows the website with no new
// store build, and while campaigns are open to testers alone the answer is
// yes only for their accounts.
//
// No until the server has said yes: a door is never drawn and then taken
// away.
//
// The same answer carries the parts of campaigns the server has switched on
// ("Prayed by many", pictures: lib/campaigns/parts.ts, which only the server
// can load). An app has no value of its own for a part: it is off until the
// server says it is on, so a part opens for every app the moment the website
// says so, with no new store build.

import { useSyncExternalStore } from "react";

import { apiFetch } from "@/lib/api/client";

import { campaignsInBuild } from "./flags";
import { CAMPAIGN_PART_NAMES, type CampaignPart } from "./model";

let answer: boolean | null = null;
let asking = false;
/** The parts the server said are on. None until it has answered, and none it did not name. */
let partsOn: ReadonlySet<CampaignPart> = new Set();
const waiting = new Set<() => void>();

function ask(): void {
  if (asking || answer !== null) return;
  asking = true;
  void apiFetch("/api/campaigns/open")
    .then(async (res) => {
      if (!res.ok) return { open: false, on: new Set<CampaignPart>() };
      let told: unknown = null;
      try {
        told = ((await res.json()) as { parts?: unknown }).parts;
      } catch {
        told = null;
      }
      const said = (told && typeof told === "object" ? told : {}) as Record<string, unknown>;
      // Only a part this build knows, and only a plain yes.
      return { open: true, on: new Set(CAMPAIGN_PART_NAMES.filter((p) => said[p] === true)) };
    })
    .catch(() => ({ open: false, on: new Set<CampaignPart>() }))
    .then(({ open, on }) => {
      answer = open;
      partsOn = on;
      asking = false;
      for (const cb of waiting) cb();
    });
}

/** Wait for the answer, asking for it if nobody has. A closed build waits for nothing and asks nobody. Exported for the test that holds that. */
export function subscribeCampaignsOpen(cb: () => void): () => void {
  if (!campaignsInBuild()) return () => {};
  waiting.add(cb);
  ask();
  return () => {
    waiting.delete(cb);
  };
}
const subscribe = subscribeCampaignsOpen;

/** The answer as it stands: yes only once the server has said yes. Exported for the same test. */
export function campaignsOpenNow(): boolean {
  return campaignsInBuild() && answer === true;
}
const read = campaignsOpenNow;
const never = () => false;

/** Whether campaigns are open for this reader. False on the server, in a closed build, and until the server says yes. */
export function useCampaignsOpen(): boolean {
  return useSyncExternalStore(subscribe, campaignsInBuild() ? read : never, never);
}

const readAnswer = () => answer;
const closedAnswer = () => false as const;
const unasked = () => null;

/**
 * The same answer for a campaign's own pages, which must tell "not asked yet"
 * from "no": null until the server has answered, then yes or no. A closed
 * build answers no at once (and its pages are not found on the server before
 * this is ever reached).
 */
export function useCampaignsAnswer(): boolean | null {
  return useSyncExternalStore(subscribe, campaignsInBuild() ? readAnswer : closedAnswer, campaignsInBuild() ? unasked : closedAnswer);
}

/** Whether the server has switched a part on, as it stands. Exported for the test that holds it. */
export function campaignPartNow(part: CampaignPart): boolean {
  return campaignsInBuild() && answer === true && partsOn.has(part);
}

/**
 * Whether a part of campaigns is on for this reader: "Prayed by many", or
 * pictures. False on the server, in a closed build, until the server has
 * answered, and whenever it has not said yes.
 */
export function useCampaignPart(part: CampaignPart): boolean {
  return useSyncExternalStore(
    subscribe,
    campaignsInBuild() ? () => campaignPartNow(part) : never,
    never,
  );
}

/** Test seam: forget the answer. */
export function __forgetCampaignsOpen(): void {
  answer = null;
  asking = false;
  partsOn = new Set();
}
