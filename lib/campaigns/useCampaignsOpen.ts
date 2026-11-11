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
// A server that could not be reached (no signal, or it failed) is not a
// server that said no. Every door reads both as "not yes", so nothing is
// drawn; a campaign's own page tells them apart (useCampaignsDoor), so an
// address opened with no signal says so and never that campaigns are closed.
// What was not heard is asked again by itself when the signal returns, or
// when the reader taps Try again.
//
// The same answer carries the parts of campaigns the server has switched on
// ("Prayed by many", pictures: lib/campaigns/parts.ts, which only the server
// can load). An app has no value of its own for a part: it is off until the
// server says it is on, so a part opens for every app the moment the website
// says so, with no new store build. One part is held back by the build as
// well: a store build cut without pictures never has them, whatever the
// server says (./partsHere.ts).

import { useSyncExternalStore } from "react";

import { apiFetch } from "@/lib/api/client";

import { campaignsInBuild } from "./flags";
import { CAMPAIGN_PART_NAMES, type CampaignPart } from "./model";
import { partInThisBuild } from "./partsHere";

let answer: boolean | null = null;
let asking = false;
/** The server could not be reached for the answer: "not yes" for every door, and said as itself on a campaign's own page. */
let unreached = false;
/** Whether the return of a signal is already being waited for, so it is waited for once. */
let listening = false;
/** The parts the server said are on. None until it has answered, and none it did not name. */
let partsOn: ReadonlySet<CampaignPart> = new Set();
const waiting = new Set<() => void>();

function ask(): void {
  if (asking || answer !== null) return;
  asking = true;
  void apiFetch("/api/campaigns/open")
    .then(async (res) => {
      // A no is an answer (404 while campaigns are closed for this reader). A server that fails gave none.
      if (!res.ok) return { open: false, on: new Set<CampaignPart>(), missed: res.status >= 500 };
      let told: unknown = null;
      try {
        told = ((await res.json()) as { parts?: unknown }).parts;
      } catch {
        told = null;
      }
      const said = (told && typeof told === "object" ? told : {}) as Record<string, unknown>;
      // Only a part this build knows and has, and only a plain yes.
      return { open: true, on: new Set(CAMPAIGN_PART_NAMES.filter((p) => said[p] === true && partInThisBuild(p))), missed: false };
    })
    .catch(() => ({ open: false, on: new Set<CampaignPart>(), missed: true }))
    .then(({ open, on, missed }) => {
      answer = open;
      partsOn = on;
      unreached = missed;
      asking = false;
      if (missed) askWhenOnline();
      for (const cb of waiting) cb();
    });
}

/** What was not heard is asked again the moment the device has a signal, so a door opens with no reload. */
function askWhenOnline(): void {
  if (listening || typeof window === "undefined" || typeof window.addEventListener !== "function") return;
  listening = true;
  window.addEventListener(
    "online",
    () => {
      listening = false;
      askCampaignsAgain();
    },
    { once: true },
  );
}

/**
 * Ask the server again, for an answer that was never heard: by the reader's
 * own tap on Try again, or when the signal returns. A no the server gave is
 * not asked again: it stands for this page load, as a yes does.
 */
export function askCampaignsAgain(): void {
  if (!campaignsInBuild() || asking || !unreached) return;
  // Asking again: the answer, when it comes, says afresh whether the server was reached.
  answer = null;
  // The pages show that they are asking, then what was answered.
  for (const cb of waiting) cb();
  ask();
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

/** What a campaign's own page is to draw: the campaign, a wait, that campaigns are not open, or that the server was not reached. */
export type CampaignsDoor = "asking" | "open" | "closed" | "unreached";

/** The door as it stands. Exported for the test that holds it. */
export function campaignsDoorNow(): CampaignsDoor {
  if (!campaignsInBuild()) return "closed";
  return answer === null ? "asking" : answer ? "open" : unreached ? "unreached" : "closed";
}
const askingDoor = () => "asking" as const;
const closedDoor = () => "closed" as const;

/**
 * The same answer for a campaign's own pages, with the one thing a door
 * elsewhere does not need to know: whether a "not yes" is the server's no, or
 * a server that was not reached. A closed build is closed at once.
 */
export function useCampaignsDoor(): CampaignsDoor {
  return useSyncExternalStore(subscribe, campaignsDoorNow, campaignsInBuild() ? askingDoor : closedDoor);
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
  unreached = false;
  listening = false;
  partsOn = new Set();
}
