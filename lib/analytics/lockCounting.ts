// Which lock a reader taps, and which leads to a purchase (1.9, item 12 of
// docs/1.9-build/PLAN.md). The Plus brainstorm of 2026-11-06 found it was the
// one thing nobody could see: "which lock a reader taps, and which lock leads
// to a purchase. The server takes onboarding and screen events only, so which
// feature sells Plus is not known" (docs/1.9-build/BRAINSTORM.md).
//
// Counted the way the screens are (./screenCounting.ts): totals in
// analytics_events, sent through /api/track/event, with no session, no
// account, no device id and no page, kept to the day, not the time.
//
//   lock_tapped  a reader met something that needs Plus and the upgrade sheet
//                opened on it: which feature (the sheet's own name for it,
//                components/billing/UpgradeModal.tsx UpgradeFeature), or
//                "general" for the Plus button that is no lock.
//   plus_bought  a purchase made in that sheet went through: the feature the
//                sheet was opened on, and the plan, a year or a month.
//
// Each carries the kind of device. Nothing else: the server takes nothing
// that is not on these lists (lib/security/schemas.ts). A purchase made on the
// pricing page, not in the sheet, is not counted here, and a restore is never
// a purchase.
//
// Pure, so the rules are tested directly (lib/analytics/__tests__/lockCounting.test.ts).
// Sending is ./lockCount.ts.

import type { CountPlatform } from "@/lib/onboarding/counting";

export const LOCK_EVENTS = ["lock_tapped", "plus_bought"] as const;
export type LockEventName = (typeof LOCK_EVENTS)[number];

export function isLockEvent(name: string): name is LockEventName {
  return (LOCK_EVENTS as readonly string[]).includes(name);
}

/**
 * Every name the upgrade sheet opens on, the sheet's own list (the test holds
 * the two equal). "general" is the Plus button, met by a reader who asked.
 */
export const LOCKS = [
  "florilegium",
  "palettes",
  "history",
  "sync",
  "crossrefs",
  "wordstudy",
  "journal",
  "plans",
  "profile",
  "remember",
  "ambience",
  "offline",
  "general",
] as const;
export type Lock = (typeof LOCKS)[number];

/** Each lock by the name the paywall gives its feature (lib/premium/plusRows.ts). */
export const LOCK_LABELS: Record<Lock, string> = {
  florilegium: "Your Florilegium",
  palettes: "Candlelight and Monastery",
  history: "History in full dress",
  sync: "Sync",
  crossrefs: "Cross-references",
  wordstudy: "Word study",
  journal: "Your journal",
  plans: "Reading plans",
  profile: "Profile extras",
  remember: "Remember the verse",
  ambience: "Ambience",
  offline: "Listen offline",
  general: "The Plus button (no lock)",
};

/** The plans a purchase in the sheet can be. */
export const BOUGHT_PLANS = ["yearly", "monthly"] as const;
export type BoughtPlan = (typeof BOUGHT_PLANS)[number];

export type LockEvent =
  | { name: "lock_tapped"; props: { lock: Lock } }
  | { name: "plus_bought"; props: { lock: Lock; plan: BoughtPlan } };

/**
 * The body the device sends: the event and the kind of device, nothing else.
 * One function for the device and its test, so what is sent is exactly what
 * the server's closed list is tested to take.
 */
export function lockEventBody(event: LockEvent, platform: CountPlatform): string {
  return JSON.stringify({ name: event.name, props: { ...event.props, platform } });
}

/** A lock's row in the admin's sums: how often it was met, and how often a purchase followed in its sheet. */
export type LockRow = { lock: Lock; taps: number; bought: number; yearly: number; monthly: number };

/** Rows of analytics_events as the admin reads them. */
export type LockEventRow = { name: string; props: Record<string, unknown> | null };

/**
 * The window's counts, a row a lock, the most met first. A row that is not
 * one of the two events, or names a lock or a plan these lists do not have,
 * is left out rather than guessed at.
 */
export function summarizeLocks(rows: readonly LockEventRow[]): { locks: LockRow[]; taps: number; bought: number } {
  const by = new Map<Lock, LockRow>();
  const row = (lock: Lock) => {
    let r = by.get(lock);
    if (!r) by.set(lock, (r = { lock, taps: 0, bought: 0, yearly: 0, monthly: 0 }));
    return r;
  };
  let taps = 0;
  let bought = 0;
  for (const r of rows) {
    const lock = r.props?.lock;
    if (typeof lock !== "string" || !(LOCKS as readonly string[]).includes(lock)) continue;
    if (r.name === "lock_tapped") {
      row(lock as Lock).taps++;
      taps++;
    } else if (r.name === "plus_bought") {
      const plan = r.props?.plan;
      if (plan !== "yearly" && plan !== "monthly") continue;
      const it = row(lock as Lock);
      it.bought++;
      it[plan]++;
      bought++;
    }
  }
  const locks = [...by.values()].sort((a, b) => b.taps - a.taps || b.bought - a.bought || LOCKS.indexOf(a.lock) - LOCKS.indexOf(b.lock));
  return { locks, taps, bought };
}
