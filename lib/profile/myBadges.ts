"use client";

import { useEffect, useState } from "react";

import { isBadgeId, type BadgeId } from "./badges";
import { fetchMyProfile } from "./client";

/**
 * The signed-in reader's own badges, for the top of the You tab (1.8, note
 * 71): the owner's pick A of r3-25, "the Ladder, then the day", where the
 * reader's picture, name and badges stand on the Ladder.
 *
 * They are the badges the reader's profile shows (app/api/profile/me, the
 * same row as Community draws under their name), less the streak's: on You
 * the streak is the prayer rope right under them, with no flame (the owner's
 * pick B of round 5, and refinement 4 of 2026-10-31).
 *
 * Kept on the device with whose they are, so they are there from the first
 * paint on the next visit, and asked for again at most every ten minutes.
 * Offline, or before profiles are open, the kept ones stand, or none.
 */

const CACHE_KEY = "purify.myBadges";
const REREAD_MS = 10 * 60_000;
/** The streak is the rope on You, never a mark beside it. */
const ROPE_SAYS = new Set<BadgeId>(["streak_7", "streak_40", "streak_100"]);

type Kept = { uid: string; ids: BadgeId[]; at: number };

/** The ids a profile's badges come to on You, in the profile's own order. */
export function youBadges(badges: readonly { id: string }[]): BadgeId[] {
  const out: BadgeId[] = [];
  for (const b of badges) {
    if (isBadgeId(b.id) && !ROPE_SAYS.has(b.id) && !out.includes(b.id)) out.push(b.id);
  }
  return out;
}

function readKept(uid: string): Kept | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const kept = JSON.parse(raw) as Partial<Kept>;
    if (kept.uid !== uid || !Array.isArray(kept.ids) || typeof kept.at !== "number") return null;
    return { uid, ids: kept.ids.filter(isBadgeId), at: kept.at };
  } catch {
    return null;
  }
}

function writeKept(kept: Kept) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(kept));
  } catch {
    // A private window: the badges still show, they are just not remembered.
  }
}

/** The reader's badges, or null until they are known. `uid` is null when nobody is signed in. */
export function useMyBadges(uid: string | null): readonly BadgeId[] | null {
  const [state, setState] = useState<{ uid: string | null; ids: readonly BadgeId[] | null }>({ uid: null, ids: null });

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const kept = readKept(uid);
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the kept
       badges live in the device's own storage, read after mount. */
    setState({ uid, ids: kept?.ids ?? null });
    if (kept && Date.now() - kept.at < REREAD_MS) return;
    void fetchMyProfile().then((res) => {
      if (cancelled || !res.ok) return;
      const ids = youBadges(res.profile.badges);
      writeKept({ uid, ids, at: Date.now() });
      setState({ uid, ids });
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return uid && state.uid === uid ? state.ids : null;
}
