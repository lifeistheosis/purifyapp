// Sending the locks' counts (1.9): fire and forget, never in the way.
//
// What is counted and why is ./lockCounting.ts. This file only sends, on the
// screens' rules (./screenCount.ts, from lib/onboarding/count.ts): automation
// counts nothing, and a device the admin has been opened on counts nothing,
// so the owner's own taps never land in the totals. A plain fetch with no
// credentials: a count carries no cookie and no sign-in. The apps reach
// purifyapp.net the way apiFetch would (lib/api/client.ts); /api/track/event
// answers their preflight.

import { countPlatform, countingAllowed } from "@/lib/onboarding/count";
import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";

import { lockEventBody, type BoughtPlan, type Lock, type LockEvent } from "./lockCounting";

function send(event: LockEvent): void {
  if (!countingAllowed()) return;
  const url = isNativeClient() ? `${SITE_URL}/api/track/event` : "/api/track/event";
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: lockEventBody(event, countPlatform()),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* the count is lost, nothing else */
  }
}

/** The upgrade sheet opened on this lock. */
export function countLock(lock: Lock): void {
  send({ name: "lock_tapped", props: { lock } });
}

/** A purchase in the sheet went through, the sheet having opened on this lock. */
export function countBought(lock: Lock, plan: BoughtPlan): void {
  send({ name: "plus_bought", props: { lock, plan } });
}
