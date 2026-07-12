"use client";

// Resilient cross-tab auth lock for the browser Supabase client (F-13 root
// fix). supabase-js guards token reads/refreshes with a navigator.locks lock
// shared across tabs. A tab stuck mid-refresh (suspended, offline, killed
// network) can hold that lock indefinitely; every OTHER tab's getUser() then
// fails with a lock-acquire timeout and the whole auth surface bricks — the
// account gate can only offer a "Try again" that never succeeds (the live
// signature behind the 2026-07-12 "couldn't confirm your sign-in" report).
//
// This wrapper delegates to supabase's own navigatorLock, and when (and only
// when) acquisition times out, runs the operation WITHOUT the lock instead of
// failing. The lock exists to serialize token refreshes between tabs; running
// lockless risks at worst a redundant refresh, which Supabase tolerates
// (refresh-token reuse grace interval). A jammed lock, by contrast, is a
// guaranteed outage. Every other error passes through untouched.

import { navigatorLock } from "@supabase/supabase-js";

function isAcquireTimeout(e: unknown): boolean {
  return Boolean(
    e &&
      typeof e === "object" &&
      (e as { isAcquireTimeout?: boolean }).isAcquireTimeout,
  );
}

export async function resilientNavigatorLock<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  // Environments without the Locks API (older WebViews, some embedded
  // browsers) never needed the lock; just run.
  if (
    typeof navigator === "undefined" ||
    typeof navigator.locks === "undefined"
  ) {
    return await fn();
  }
  // Never wait forever. supabase-js does NOT reliably pass a bounded timeout
  // to a custom lock: observed live (locks debug on), GoTrueClient hands the
  // custom lock `undefined`, and navigatorLock treats anything that isn't
  // `> 0` or `=== 0` as "wait indefinitely" — which is the exact jammed-tab
  // outage this wrapper exists to prevent. Cap every absent, negative, or
  // non-finite timeout to a real deadline.
  const cappedTimeout =
    typeof acquireTimeout === "number" &&
    Number.isFinite(acquireTimeout) &&
    acquireTimeout >= 0
      ? acquireTimeout
      : 5000;
  try {
    return await navigatorLock(name, cappedTimeout, fn);
  } catch (e) {
    if (isAcquireTimeout(e)) {
      return await fn();
    }
    throw e;
  }
}
