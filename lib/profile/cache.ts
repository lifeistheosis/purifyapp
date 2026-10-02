"use client";

import { fetchProfile, type ProfileError } from "./client";
import type { PublicProfile } from "./publicProfile";

// Profiles already seen, and the ones on their way, for the life of the page.
//
// Opening a profile used to start its request on the tap and wait the whole
// round trip with a skeleton on screen. Now the request starts the moment a
// finger touches a name (or a mouse rests on one), the hover card and the
// full card share one copy, and a profile seen in the last half minute opens
// with no request at all. The server's own cache is twenty seconds
// (app/api/community/profile/route.ts), so this never shows anything older
// than a reload would.

type Result = { ok: true; profile: PublicProfile } | ProfileError;

const FRESH_MS = 30_000;
const CACHE = new Map<string, { profile: PublicProfile; at: number }>();
const INFLIGHT = new Map<string, Promise<Result>>();

export function cachedProfile(handle: string): PublicProfile | null {
  return CACHE.get(handle)?.profile ?? null;
}

/** The profile, from the cache when fresh, sharing any request already out. */
export function loadProfile(handle: string, opts: { fresh?: boolean } = {}): Promise<Result> {
  const hit = CACHE.get(handle);
  if (hit && !opts.fresh && Date.now() - hit.at < FRESH_MS) return Promise.resolve({ ok: true, profile: hit.profile });
  const running = INFLIGHT.get(handle);
  if (running) return running;
  const p = fetchProfile(handle).then((res) => {
    INFLIGHT.delete(handle);
    if (res.ok) CACHE.set(handle, { profile: res.profile, at: Date.now() });
    return res;
  });
  INFLIGHT.set(handle, p);
  return p;
}

/** Start loading a profile the reader is about to open. */
export function prefetchProfile(handle: string | null | undefined): void {
  if (handle) void loadProfile(handle);
}

/** Put a fresher copy in the cache, after the reader changed something on it. */
export function patchCachedProfile(handle: string, patch: Partial<PublicProfile>): void {
  const hit = CACHE.get(handle);
  if (hit) CACHE.set(handle, { profile: { ...hit.profile, ...patch }, at: hit.at });
}
