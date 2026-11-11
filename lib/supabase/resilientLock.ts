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
// when) acquisition times out before the operation starts, runs the
// operation WITHOUT the lock instead of failing. The lock exists to
// serialize token refreshes between tabs; running lockless risks at worst a
// redundant refresh, which Supabase tolerates (refresh-token reuse grace
// interval). A jammed lock, by contrast, is a guaranteed outage. Every other
// error passes through untouched.
//
// A stolen lock (1.9, found by Fable Themes on a slow signal, 2026-11-11:
// an uncaught "Lock broken by another request with the 'steal' option").
// From supabase-js 2.105 navigatorLock steals a lock it has waited on past
// its timeout, and the Web Locks API then rejects the holder's request while
// the holder's operation runs on to its end. Two things followed here. The
// holder whose lock was taken got supabase's typed timeout error, and this
// wrapper ran its operation a SECOND time, beside the first, still running;
// and a thief whose lock was stolen in turn (three calls overlapping on a
// slow signal) got the raw AbortError, which no caller expects: a session
// read, a code exchange after a sign-in or a refresh answered with an error
// while its work went on and landed. Now the operation runs once: when its
// lock is taken from it while it runs, its own outcome is the answer. And a
// timeout of 0, supabase's "only if the lock is free" (the refresh tick,
// which skips a tick while another holds the lock), is passed on as asked
// rather than run lockless beside the holder.

import { navigatorLock } from "@supabase/supabase-js";

function isAcquireTimeout(e: unknown): boolean {
  return Boolean(
    e &&
      typeof e === "object" &&
      (e as { isAcquireTimeout?: boolean }).isAcquireTimeout,
  );
}

/** The Web Locks API's answer to a request whose lock another request took ("steal"), as it comes raw. */
function isAbort(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && (e as { name?: string }).name === "AbortError");
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
  // The operation, once the lock has let it start. If the lock is then
  // taken from it, it runs on, and its own outcome is the answer.
  let started: Promise<R> | null = null;
  const run = (): Promise<R> => (started = fn());
  try {
    return await navigatorLock(name, cappedTimeout, run);
  } catch (e) {
    if (started && (isAcquireTimeout(e) || isAbort(e))) return await started;
    if (isAcquireTimeout(e)) {
      // Asked to take the lock only if it is free: say it was not.
      if (cappedTimeout === 0) throw e;
      return await fn();
    }
    throw e;
  }
}
