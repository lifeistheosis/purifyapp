"use client";

// React hook for the calendar-reckoning preference. Split from
// `styleDefault.ts` because that module is imported by server components
// (the calendar page reads the cookie at request time), and importing
// `useSyncExternalStore` into a server component is a Next 16 hard error.

import { useCallback, useSyncExternalStore } from "react";
import {
  CALENDAR_STYLE_EVENT,
  CALENDAR_STYLE_KEY,
  readCalendarStyleDefault,
  writeCalendarStyleDefault,
  type CalendarStyleDefault,
} from "./styleDefault";

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  function onStorage(e: StorageEvent) {
    if (e.key === CALENDAR_STYLE_KEY) cb();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(CALENDAR_STYLE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CALENDAR_STYLE_EVENT, cb);
  };
}

/**
 * Live calendar-style preference + setter. The setter writes through to
 * localStorage + the cookie and fires `CALENDAR_STYLE_EVENT` so in-tab
 * subscribers refresh immediately (without depending on the cross-tab
 * `storage` event, which doesn't fire in the same tab that wrote).
 *
 * SSR snapshot returns "new" (the global default); the calendar page that
 * actually needs a server-rendered value reads the cookie directly.
 */
export function useCalendarStyleDefault(): readonly [
  CalendarStyleDefault,
  (v: CalendarStyleDefault) => void,
] {
  const style = useSyncExternalStore<CalendarStyleDefault>(
    subscribe,
    readCalendarStyleDefault,
    () => "new",
  );
  const set = useCallback((v: CalendarStyleDefault) => {
    writeCalendarStyleDefault(v);
  }, []);
  return [style, set] as const;
}
