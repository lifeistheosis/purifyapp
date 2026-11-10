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

import { useSyncExternalStore } from "react";

import { apiFetch } from "@/lib/api/client";

import { campaignsInBuild } from "./flags";

let answer: boolean | null = null;
let asking = false;
const waiting = new Set<() => void>();

function ask(): void {
  if (asking || answer !== null) return;
  asking = true;
  void apiFetch("/api/campaigns/open")
    .then((res) => res.ok)
    .catch(() => false)
    .then((open) => {
      answer = open;
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

/** Test seam: forget the answer. */
export function __forgetCampaignsOpen(): void {
  answer = null;
  asking = false;
}
