"use client";

// Client store for the developer options (test premium, feature flags,
// theme stub). Persisted in localStorage; "test premium" additionally
// mirrors to a cookie so the server entitlement resolver can honor it.
// These only do anything for an allowlisted developer account — the
// resolvers verify the email before granting (see lib/dev/developer).

import { useSyncExternalStore } from "react";
import { DEV_PLUS_COOKIE, type DevFeatureKey } from "./developer";

const KEY = "purify:dev:options";
const EVENT = "purify:dev:options";

export type DevOptions = {
  testPremium: boolean;
  flags: Partial<Record<DevFeatureKey, boolean>>;
  /** Stubbed for now: the app has one theme. */
  theme: "default";
};

const DEFAULTS: DevOptions = { testPremium: false, flags: {}, theme: "default" };

function read(): DevOptions {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DevOptions>) };
  } catch {
    return DEFAULTS;
  }
}

function syncCookie(on: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = on
    ? `${DEV_PLUS_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    : `${DEV_PLUS_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function write(next: DevOptions) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  syncCookie(next.testPremium);
  window.dispatchEvent(new Event(EVENT));
}

let cache: DevOptions | null = null;
function getSnapshot(): DevOptions {
  cache ??= read();
  return cache;
}
function subscribe(cb: () => void) {
  const handler = () => {
    cache = read();
    cb();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
function getServerSnapshot(): DevOptions {
  return DEFAULTS;
}

export function useDevOptions() {
  const options = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    options,
    setTestPremium(on: boolean) {
      write({ ...read(), testPremium: on });
    },
    setFlag(key: DevFeatureKey, on: boolean) {
      const cur = read();
      write({ ...cur, flags: { ...cur.flags, [key]: on } });
    },
  };
}

/** Read a dev feature flag (client-side gates). */
export function isDevFlagOn(key: DevFeatureKey): boolean {
  return read().flags[key] === true;
}

/** Quick, allocation-free presence check of the test-premium cookie, used
 * by the client entitlement resolver before the (async) email verification. */
export function devPlusCookiePresent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim() === `${DEV_PLUS_COOKIE}=1`);
}
