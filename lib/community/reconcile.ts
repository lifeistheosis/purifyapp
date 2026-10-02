// Keeping what did not change, between two reads of the feed.
//
// The feed refreshes itself every eight seconds (components/community/
// CommunityClient.tsx). Each refresh used to hand React fifty brand-new post
// objects and a fresh map of the reader's own reactions, so every post card
// re-rendered on every tick whether anything had changed or not. Measured
// 2026-10-02 on a phone-speed CPU: about four seconds of blocked main thread
// per refresh, which is what made likes, scrolling and opening a profile
// stutter.
//
// These return the PREVIOUS value wherever the new one says the same thing,
// so an unchanged post keeps its identity, a memoised card skips its render,
// and a refresh that brings nothing new re-renders nothing at all.

import type { CommunityPost } from "./types";

/** Every field a post card draws, compared by value. */
function samePost(a: CommunityPost, b: CommunityPost): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof CommunityPost>;
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/**
 * The next feed, reusing the previous post objects that did not change. When
 * nothing changed at all, the previous array itself comes back, so a state
 * setter handed it does nothing.
 */
export function reconcilePosts(prev: CommunityPost[] | null | undefined, next: CommunityPost[]): CommunityPost[] {
  if (!prev || prev.length === 0) return next;
  const byId = new Map(prev.map((p) => [p.id, p]));
  let changed = prev.length !== next.length;
  const out = next.map((p, i) => {
    const old = byId.get(p.id);
    if (old && samePost(old, p)) {
      if (prev[i] !== old) changed = true;
      return old;
    }
    changed = true;
    return p;
  });
  return changed ? out : prev;
}

/** The previous map when the next one holds the same entries. */
export function sameEntries<V>(prev: Record<string, V>, next: Record<string, V>): Record<string, V> {
  const a = Object.keys(prev);
  const b = Object.keys(next);
  if (a.length !== b.length) return next;
  for (const k of b) {
    if (prev[k] !== next[k]) return next;
  }
  return prev;
}

/** The previous set when the next one holds the same members. */
export function sameMembers(prev: Set<string>, next: Iterable<string>): Set<string> {
  const n = new Set(next);
  if (n.size !== prev.size) return n;
  for (const v of n) if (!prev.has(v)) return n;
  return prev;
}
