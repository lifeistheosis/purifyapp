import type { NativePlatform } from "@/lib/platform/native";
import type { DayKey } from "@/lib/rhythm/dayKey";

/**
 * The widget tip: one quiet card, shown once, that says Purify has a home
 * screen widget and how to add it.
 *
 * A widget is found by the readers who go looking in the launcher's list, and
 * most never do. So the app says it once: a card at the foot of Today, under
 * the Church's day, which is what the widget shows. It waits two days so it
 * does not arrive on top of a new reader's first steps, it is dismissed with
 * one tap, and it never returns. Settings keeps the steps for anyone who
 * wants them again (components/widget/WidgetTip.tsx).
 *
 * Everything here is a plain function over what the caller hands in, so it is
 * tested without a phone.
 */

/**
 * The shells that carry a widget.
 *
 * Android has one: DayWidgetProvider, the day's commemoration and the fast.
 * The iPhone has none yet, and a tip there would send a reader looking for
 * something that is not in the list. Add "ios" in the commit that ships the
 * WidgetKit extension, and write its steps below in the same commit.
 */
export const WIDGET_PLATFORMS: readonly NativePlatform[] = ["android"];

/** Whether the phone in hand has a Purify widget to add. Never true on the web. */
export function hasWidget(platform: NativePlatform | null): platform is NativePlatform {
  return platform !== null && WIDGET_PLATFORMS.includes(platform);
}

/**
 * How to add it, as message keys, in order. A shell with no widget has no
 * steps, so no string is written for a thing that does not exist.
 *
 * The Android words follow the stock launcher. Others say it a little
 * differently, which the sheet admits in one line under the steps.
 */
export const WIDGET_STEPS: Record<NativePlatform, readonly string[]> = {
  android: ["widgetTip.android.step1", "widgetTip.android.step2", "widgetTip.android.step3"],
  ios: [],
};

/** Where this device keeps what it knows about the tip. */
export const WIDGET_TIP_KEY = "purify.widgetTip";
/** Sent on this device when that changes, so the card and Settings agree. */
export const WIDGET_TIP_EVENT = "purify:widget-tip";

/**
 * Whole days a reader has had the app in hand before the card shows. Day 1
 * belongs to onboarding's own card at the top of Today.
 */
export const WIDGET_TIP_WAIT_DAYS = 2;

export type WidgetTipState = {
  /** The first day this phone could have shown the card. The wait counts from it. */
  first: DayKey | null;
  /** Dismissed, or the steps were opened. Either way it does not come back. */
  done: boolean;
};

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Read what storage holds. Anything else there reads as "never seen". */
export function parseTipState(raw: string | null | undefined): WidgetTipState {
  const fresh: WidgetTipState = { first: null, done: false };
  if (!raw) return fresh;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return fresh;
    const { first, done } = value as { first?: unknown; done?: unknown };
    return {
      first: typeof first === "string" && DAY_KEY.test(first) ? first : null,
      done: done === true,
    };
  } catch {
    return fresh;
  }
}

/** Whole days from one day key to another. Negative when `to` is the earlier. */
export function daysApart(from: DayKey, to: DayKey): number {
  const at = (key: DayKey) => Date.parse(`${key}T12:00:00Z`);
  return Math.round((at(to) - at(from)) / 86_400_000);
}

/**
 * Whether the card shows today.
 *
 * Not on the web and not in a shell without a widget. Not once it is done.
 * Not until the wait has passed. A clock set back reads as "not yet", never
 * as "long ago".
 */
export function tipDue(state: WidgetTipState, today: DayKey, platform: NativePlatform | null): boolean {
  if (!hasWidget(platform) || state.done || !state.first) return false;
  return daysApart(state.first, today) >= WIDGET_TIP_WAIT_DAYS;
}
