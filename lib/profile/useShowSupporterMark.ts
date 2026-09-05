"use client";

// React hook for the supporter-mark opt-out. Split from supporterMark.ts the
// way useCalendarStyleDefault.ts is split from styleDefault.ts: the state
// module stays importable from anywhere, and the hook is the only file that
// touches React.

import { useCallback, useSyncExternalStore } from "react";

import { pushProfilePrefs } from "./preferences";
import {
  SUPPORTER_MARK_EVENT,
  SUPPORTER_MARK_KEY,
  readShowSupporterMark,
  writeShowSupporterMark,
} from "./supporterMark";

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  function onStorage(e: StorageEvent) {
    if (e.key === SUPPORTER_MARK_KEY) cb();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(SUPPORTER_MARK_EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SUPPORTER_MARK_EVENT, cb);
  };
}

function readEffective(): boolean {
  return readShowSupporterMark() ?? true;
}

/**
 * The toggle's live value and its setter. The setter writes the device and
 * then pushes to the account at once, because unlike focus and depth this
 * preference has a server-side effect: the trigger on
 * profiles.show_supporter_mark is what clears the mark from the feed, and a
 * reader who turns it off expects it gone now, not at the next sign-in.
 * The push fails silent when signed out; the local answer is then carried
 * up at the next sign-in like every other preference.
 */
export function useShowSupporterMark(): readonly [boolean, () => void] {
  const on = useSyncExternalStore(subscribe, readEffective, () => true);
  const toggle = useCallback(() => {
    writeShowSupporterMark(!readEffective());
    void pushProfilePrefs();
  }, []);
  return [on, toggle] as const;
}
