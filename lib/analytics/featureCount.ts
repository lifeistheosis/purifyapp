// Sending the 1.9 counts (admin item A5): fire and forget, never in the way.
//
// What is counted and why is ./featureCounting.ts. This file only sends, on
// the locks' rules (./lockCount.ts, from lib/onboarding/count.ts): automation
// counts nothing, and a device the admin has been opened on counts nothing,
// so the owner's own use never lands in the totals. A plain fetch with no
// credentials: a count carries no cookie and no sign-in. The apps reach
// purifyapp.net the way apiFetch would (lib/api/client.ts); /api/track/event
// answers their preflight.
//
// The app calls these where each thing happens (the Updates chat wires them):
// a Bible download finishing, a plan's first day opened the first time and
// its last day marked, a new journal page first saved and a share link made,
// and the app opening (the version, at most once a UTC day).

import { countPlatform, countingAllowed } from "@/lib/onboarding/count";
import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

import { BIBLE_ID, featureEventBody, PLAN_ID, versionDue, versionStamp, type FeatureEvent } from "./featureCounting";

/** The day and version of the last version_in_use this device sent. */
const VERSION_KEY = "purify:count.version-day";

function send(event: FeatureEvent): void {
  if (!countingAllowed()) return;
  const url = isNativeClient() ? `${SITE_URL}/api/track/event` : "/api/track/event";
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: featureEventBody(event, countPlatform()),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* the count is lost, nothing else */
  }
}

/** A downloaded Bible finished arriving (its translation's id in lib/bible/downloads/catalog.ts). */
export function countBibleDownloaded(translation: string): void {
  if (BIBLE_ID.test(translation)) send({ name: "bible_downloaded", props: { translation } });
}

/** A reading plan's first day was opened for the first time (its id in lib/plans/plans.ts). */
export function countPlanBegun(plan: string): void {
  if (PLAN_ID.test(plan)) send({ name: "plan_begun", props: { plan } });
}

/** A reading plan's last day was marked read. */
export function countPlanFinished(plan: string): void {
  if (PLAN_ID.test(plan)) send({ name: "plan_finished", props: { plan } });
}

/** A new journal page was saved for the first time (never an edit). */
export function countJournalPageWritten(): void {
  send({ name: "journal_page_written", props: {} });
}

/** A journal page was shared: call it once the server has made the share. */
export function countJournalPageShared(): void {
  send({ name: "journal_page_shared", props: {} });
}

/**
 * The app opened: its version, at most once a UTC day on this device. Safe to
 * call on every open. With storage blocked it sends nothing, rather than once
 * a page.
 */
export function countVersionInUse(now: Date = new Date()): void {
  if (!countingAllowed()) return;
  try {
    const kept = window.localStorage.getItem(VERSION_KEY);
    if (!versionDue(kept, CURRENT_VERSION, now)) return;
    window.localStorage.setItem(VERSION_KEY, versionStamp(CURRENT_VERSION, now));
  } catch {
    return;
  }
  send({ name: "version_in_use", props: { version: CURRENT_VERSION } });
}
