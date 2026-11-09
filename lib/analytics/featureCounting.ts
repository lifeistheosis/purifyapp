// The 1.9 counts (admin item A5; Edgar's yes of 2026-11-09, with the privacy
// line he approved the same day: "We count, without your name, which Bible
// translations are downloaded, which reading plans are begun and finished,
// how many journal pages are written and shared, and which version of the app
// is in use.").
//
// Counted the way the locks are (./lockCounting.ts): totals in
// analytics_events, sent through /api/track/event with no session, no
// account, no device id and no page, and kept to the day, not the time (a
// share stamped to the second could be laid beside the shared page itself).
//
//   bible_downloaded  a downloaded Bible finished arriving: which translation,
//                     by its id in the download catalog (lib/bible/downloads/catalog.ts)
//   plan_begun        a reading plan's first day opened for the first time
//   plan_finished     a reading plan's last day marked read
//                     (both by the plan's id, lib/plans/plans.ts)
//   journal_page_written  a new journal page saved for the first time (never an edit)
//   journal_page_shared   a journal page's share, once the server has made it
//   version_in_use    the app opened, once a UTC day a device, with its version
//                     (lib/whatsNew/version.ts CURRENT_VERSION)
//
// Each carries the kind of device, and nothing else: the server takes nothing
// that is not on these lists (lib/security/schemas.ts). A Bible or a plan is
// held to the shape of an id rather than to today's list, so one added later
// is counted by the apps already installed; a shape cannot carry a name.
//
// Pure, so the rules are tested directly (lib/analytics/__tests__/featureCounting.test.ts).
// Sending is ./featureCount.ts.

import type { CountPlatform } from "@/lib/onboarding/counting";

export const FEATURE_EVENTS = [
  "bible_downloaded",
  "plan_begun",
  "plan_finished",
  "journal_page_written",
  "journal_page_shared",
  "version_in_use",
] as const;
export type FeatureEventName = (typeof FEATURE_EVENTS)[number];

export function isFeatureEvent(name: string): name is FeatureEventName {
  return (FEATURE_EVENTS as readonly string[]).includes(name);
}

/** A downloadable Bible's id: "ru-synodal", "grc-lxx-patriarchal". */
export const BIBLE_ID = /^[a-z]{2,3}(-[a-z0-9]{1,16}){1,4}$/;
/** A reading plan's id: "psalter", "nativity". */
export const PLAN_ID = /^[a-z][a-z0-9]{0,23}(-[a-z0-9]{1,16}){0,3}$/;
/** The app's version: "1.9", "1.9.1". */
export const APP_VERSION = /^\d{1,2}\.\d{1,2}(\.\d{1,2})?$/;

export type FeatureEvent =
  | { name: "bible_downloaded"; props: { translation: string } }
  | { name: "plan_begun"; props: { plan: string } }
  | { name: "plan_finished"; props: { plan: string } }
  | { name: "journal_page_written"; props: Record<string, never> }
  | { name: "journal_page_shared"; props: Record<string, never> }
  | { name: "version_in_use"; props: { version: string } };

/**
 * The body the device sends: the event and the kind of device, nothing else.
 * One function for the device and its test, so what is sent is exactly what
 * the server's closed list is tested to take.
 */
export function featureEventBody(event: FeatureEvent, platform: CountPlatform): string {
  return JSON.stringify({ name: event.name, props: { ...event.props, platform } });
}

/** What a device keeps to send version_in_use once a UTC day: the day and the version. */
export function versionStamp(version: string, now: Date): string {
  return `${now.toISOString().slice(0, 10)}|${version}`;
}

/** Whether today's version_in_use is still to send, given the stamp kept from the last one. */
export function versionDue(kept: string | null, version: string, now: Date): boolean {
  return kept !== versionStamp(version, now);
}

// ── The admin's sums ─────────────────────────────────────────────────────

/** Rows of analytics_events as the admin reads them. */
export type FeatureEventRow = { name: string; props: Record<string, unknown> | null };

export type FeatureSums = {
  /** Downloads finished, a row a translation, the most first. */
  bibles: { translation: string; downloads: number }[];
  /** Begun and finished, a row a plan, the most begun first. */
  plans: { plan: string; begun: number; finished: number }[];
  journal: { written: number; shared: number };
  /**
   * Days a device opened the app, by version, the most first, with the part
   * of all of them each version is. One device opening every day of a week
   * is seven: this says which versions are in use, not how many devices.
   */
  versions: { version: string; deviceDays: number; share: number }[];
};

const text = (v: unknown, shape: RegExp): string | null => (typeof v === "string" && shape.test(v) ? v : null);

/**
 * The window's sums. A row that is not one of the six events, or whose id is
 * not the shape of one, is left out rather than guessed at.
 */
export function summarizeFeatures(rows: readonly FeatureEventRow[]): FeatureSums {
  const bibles = new Map<string, number>();
  const plans = new Map<string, { begun: number; finished: number }>();
  const versions = new Map<string, number>();
  const journal = { written: 0, shared: 0 };
  const plan = (id: string) => {
    let p = plans.get(id);
    if (!p) plans.set(id, (p = { begun: 0, finished: 0 }));
    return p;
  };
  for (const r of rows) {
    switch (r.name) {
      case "bible_downloaded": {
        const id = text(r.props?.translation, BIBLE_ID);
        if (id) bibles.set(id, (bibles.get(id) ?? 0) + 1);
        break;
      }
      case "plan_begun":
      case "plan_finished": {
        const id = text(r.props?.plan, PLAN_ID);
        if (id) plan(id)[r.name === "plan_begun" ? "begun" : "finished"] += 1;
        break;
      }
      case "journal_page_written":
        journal.written += 1;
        break;
      case "journal_page_shared":
        journal.shared += 1;
        break;
      case "version_in_use": {
        const v = text(r.props?.version, APP_VERSION);
        if (v) versions.set(v, (versions.get(v) ?? 0) + 1);
        break;
      }
    }
  }
  const deviceDays = [...versions.values()].reduce((a, b) => a + b, 0);
  return {
    bibles: [...bibles]
      .map(([translation, downloads]) => ({ translation, downloads }))
      .sort((a, b) => b.downloads - a.downloads || a.translation.localeCompare(b.translation)),
    plans: [...plans]
      .map(([id, p]) => ({ plan: id, ...p }))
      .sort((a, b) => b.begun - a.begun || b.finished - a.finished || a.plan.localeCompare(b.plan)),
    journal,
    versions: [...versions]
      .map(([version, n]) => ({ version, deviceDays: n, share: deviceDays ? n / deviceDays : 0 }))
      .sort((a, b) => b.deviceDays - a.deviceDays || b.version.localeCompare(a.version, undefined, { numeric: true })),
  };
}
