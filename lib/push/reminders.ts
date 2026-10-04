// Unified prayer-reminders facade. Picks native push (APNs/FCM, inside the
// Capacitor shell) or Web Push (browser/PWA) so callers — the onboarding
// priming step and the account opt-in toggle — don't branch themselves.

import { isNativeClient } from "@/lib/platform/native";
import {
  EVENING_DEFAULT,
  MORNING_DEFAULT,
  getExistingSubscription,
  markSaved,
  permissionDenied,
  persistSubscription,
  pushSupported,
  removeSubscription,
  requestAndSubscribe,
  stashPending,
} from "./client";
import {
  disableNative,
  enableNative,
  nativeStatus,
  updateNativeTimes,
} from "./native";

export { MORNING_DEFAULT, EVENING_DEFAULT };

export type ReminderStatus =
  | "unsupported"
  | "denied"
  | "not-subscribed"
  | "subscribed";

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" | "no-vapid" | "failed" };

export async function remindersStatus(): Promise<ReminderStatus> {
  if (isNativeClient()) return nativeStatus();
  if (!pushSupported()) return "unsupported";
  if (permissionDenied()) return "denied";
  return (await getExistingSubscription()) ? "subscribed" : "not-subscribed";
}

export async function enableReminders(
  morning: string = MORNING_DEFAULT,
  evening: string = EVENING_DEFAULT,
): Promise<EnableResult> {
  if (isNativeClient()) return enableNative(morning, evening);

  const result = await requestAndSubscribe();
  if (!result.ok) return { ok: false, reason: result.reason };
  try {
    const res = await persistSubscription(result.subscription, morning, evening);
    if (res.status === 401) {
      // Signed-out web visitor: keep the browser subscription, persist on login.
      stashPending(result.subscription, morning, evening);
    } else if (!res.ok) {
      // The browser is subscribed and the server did not take it: saying
      // "on" would promise reminders that have nowhere to come from. Kept
      // with its times, so the next visit sends it again (healWebPush).
      stashPending(result.subscription, morning, evening);
      return { ok: false, reason: "failed" };
    } else {
      markSaved(result.subscription.endpoint);
    }
  } catch {
    // Offline at that moment: keep it for the next sign-in or visit.
    stashPending(result.subscription, morning, evening);
  }
  return { ok: true };
}

export async function disableReminders(): Promise<void> {
  if (isNativeClient()) return disableNative();
  await removeSubscription();
}

export async function updateReminderTimes(
  morning: string,
  evening: string,
): Promise<void> {
  if (isNativeClient()) return updateNativeTimes(morning, evening);
  const sub = await getExistingSubscription();
  if (!sub) return;
  const res = await persistSubscription(sub, morning, evening);
  if (res.ok) markSaved(sub.endpoint);
}
