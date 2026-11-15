// The language the app opens in, and the moment it is known.
//
// The apps are built in English: the export has no request to read a cookie
// from, so every page is drawn in English and corrected on the device
// (components/i18n/LocaleBootstrap.tsx). Until 1.6 nothing waited for that
// correction. The launch splash lifted two frames after the app came alive,
// onto Today in English, and the reader's own language arrived a moment
// later with the whole screen drawn a second time. Measured on the export,
// the processor slowed four times, a phone set to Greek showed English for
// about 1.25 s on a first open and 0.6 s with a language already chosen, on
// every cold start.
//
// Two things here put that right:
//
//   launchLanguage   which language to open in, from what the device
//                    remembers and what it is set to. No network: the
//                    account's language is asked for afterwards.
//   the settled mark one flag for the whole page, set when that language is
//                    on the screen. The first screen is not drawn before it
//                    (components/i18n/LaunchLanguageGate.tsx), so it is
//                    drawn once, in the right language, and the splash is
//                    not lifted before it either
//                    (components/native/NativeBridge.tsx).
//
// Nothing here may ever hold the app shut. The mark has a deadline of its
// own, armed by whoever waits on it, and sets itself when the deadline
// passes: the worst a fault here can do is what the app did before 1.6.

import {
  isLocaleSelectable,
  negotiateFromLanguages,
  resolveLocale,
  type LocaleCode,
} from "./locales";

/** The longest the first screen is held for its language. */
export const LAUNCH_LANGUAGE_WAIT_MS = 2500;

/**
 * The language to open in.
 *
 * A language the reader chose on this device comes first. Otherwise the
 * first of the device's own languages the app can be switched to, and
 * failing that the language the app was built in.
 */
export function launchLanguage(
  remembered: string | null | undefined,
  deviceLanguages: readonly (string | null | undefined)[],
  built: LocaleCode,
): LocaleCode {
  if (remembered && isLocaleSelectable(remembered)) return resolveLocale(remembered);
  return negotiateFromLanguages(deviceLanguages) ?? built;
}

/**
 * In the apps, whether the front door's document came up under another screen's
 * address (Updates 87). That is a screen opened straight away, a notification or
 * a link or a reload: the router is bringing it (components/native/NativeBridge.tsx,
 * a refresh, or the front door's own address when the refresh brings nothing,
 * lib/nav/entry.ts), and it waits for the reader's language
 * (components/i18n/LaunchLanguageGate.tsx). Today is not drawn under it: measured
 * on the export (docs/handoffs/updates-87.md), Today was drawn under the slate at
 * the moment the language settled, a 0.6s task with its own fetches on the screen's
 * way, and the held screen then waited seconds for some other update to start it.
 */
export function frontDoorAwaitsScreen(native: boolean, frontDoor: boolean, pathname: string | null | undefined): boolean {
  if (!native || !frontDoor || !pathname) return false;
  return (pathname.replace(/\/+$/, "") || "/") !== "/";
}

let settled = false;
let deadline: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

/** True once the opening language is on the screen, or the wait gave up. */
export function languageSettled(): boolean {
  return settled;
}

/** Say the opening language is on the screen. Safe to call more than once. */
export function markLanguageSettled(): void {
  if (settled) return;
  settled = true;
  if (deadline) clearTimeout(deadline);
  deadline = undefined;
  for (const tell of [...listeners]) tell();
}

/**
 * Start the clock on the wait, if it is not running. Called by everything
 * that waits, so the mark is set in the end whether or not the code that
 * should set it ever runs.
 */
export function armLanguageDeadline(ms: number = LAUNCH_LANGUAGE_WAIT_MS): void {
  if (settled || deadline || typeof window === "undefined") return;
  deadline = setTimeout(markLanguageSettled, ms);
}

export function subscribeLanguageSettled(tell: () => void): () => void {
  listeners.add(tell);
  return () => {
    listeners.delete(tell);
  };
}

/** Resolves when the opening language is settled, or the deadline passes. */
export function whenLanguageSettled(): Promise<void> {
  if (settled) return Promise.resolve();
  armLanguageDeadline();
  return new Promise((resolve) => {
    const leave = subscribeLanguageSettled(() => {
      leave();
      resolve();
    });
  });
}

let settledOnce: Promise<void> | null = null;

/**
 * The same promise as whenLanguageSettled, one for the whole page, for a
 * component that suspends on it (React's use() needs the same promise on
 * every render): components/i18n/LaunchLanguageGate.tsx, RouteLanguageHold.
 */
export function languageSettledPromise(): Promise<void> {
  return (settledOnce ??= whenLanguageSettled());
}

/** For tests: as a page that has only just loaded. */
export function forgetLaunchLanguageForTests(): void {
  settled = false;
  settledOnce = null;
  if (deadline) clearTimeout(deadline);
  deadline = undefined;
  listeners.clear();
}
