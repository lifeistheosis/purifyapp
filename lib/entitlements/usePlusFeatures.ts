"use client";

// Whether this reader has the Plus feature layer, for the places that SHOW a
// Plus feature to everyone and ask for Plus only when it is used.
//
// The owner's rule (2026-09-28, and the 1.4 note before it: "you can see each
// one, and tapping it tells you so"): a Plus feature is never hidden from a
// reader without Plus. It is shown with its Plus mark, and using it opens the
// upgrade sheet named for it (components/billing/UpgradeModal.tsx).
//
// null while unknown. Callers treat unknown as allowed, the FlorilegiumGate
// posture: a subscriber must never meet a lock for a second while the answer
// loads, and a reader without Plus loses nothing by seeing the feature a
// moment before its lock.
//
// plusFeatures is the enforcement-aware answer (lib/entitlements/client.ts),
// so on a surface where Plus cannot be bought yet it is true and nothing is
// locked.
//
// ONE request for the page, not one per caller. getClientEntitlements reads
// the session and a table row each time it is called, and a Bible chapter
// mounts a VerseRow per verse (176 in Psalm 118/119), every one of which
// asks. The answer is shared for a minute and dropped the moment the
// entitlements change (a purchase, a restore).

import { useEffect, useState, useSyncExternalStore } from "react";

import { clientSurface, getClientEntitlements } from "@/lib/entitlements/client";
import { plusEnforcedFor } from "@/lib/entitlements/entitlements";
import { emitEntitlementsChanged, onEntitlementsChanged } from "@/lib/entitlements/refresh";
import { createClient } from "@/lib/supabase/client";

const TTL_MS = 60_000;
let shared: { at: number; answer: Promise<boolean | null> } | null = null;
let listening = false;

/**
 * A sign-in or a sign-out changes who is asking, and nothing told the Plus
 * gates (Fable Themes' finding with build 93 note 3, 2026-11-11): the signal
 * to ask again was sent only on a purchase, so a reader who signed in with
 * Plus met a lock for up to the minute the shared answer above lives. Now
 * both send it, as a purchase does, and every gate that listens asks again,
 * this one first. The callback only sets a timer: supabase-js runs it inside
 * the auth lock, and an auth call made from in there never returns
 * (lib/profile/myPicture.ts).
 */
export function followSignInForPlus(client: Pick<ReturnType<typeof createClient>, "auth"> = createClient()): void {
  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") window.setTimeout(() => emitEntitlementsChanged(), 0);
  });
}

/** The Plus answer, shared by every caller on the page. */
export function plusFeaturesNow(): Promise<boolean | null> {
  if (typeof window !== "undefined" && !listening) {
    listening = true;
    onEntitlementsChanged(() => {
      shared = null;
    });
    try {
      followSignInForPlus();
    } catch {
      /* no client where there is no Supabase; the minute's answer stands */
    }
  }
  if (!shared || Date.now() - shared.at > TTL_MS) {
    shared = {
      at: Date.now(),
      answer: getClientEntitlements()
        .then((e) => {
          rememberPlusFeatures(e.plusFeatures);
          return e.plusFeatures;
        })
        .catch(() => null),
    };
  }
  return shared.answer;
}

// The answer as far as it can be known before it comes, for one use only:
// keeping the place of a lock that may come, so a control does not move when
// the answer arrives after the first frame (the owner's note 6 of build 80:
// on opening Pray my rule, the Ambience button and its lock moved). It never
// draws a lock and never lets a reader in: that is the live answer's alone,
// so the posture above holds, and a reader who has just subscribed elsewhere
// meets no lock while the answer loads, only a place kept for one.
const LAST_KEY = "purify:plusFeatures";
let last: boolean | null | undefined;

function rememberPlusFeatures(answer: boolean): void {
  last = answer;
  try {
    window.localStorage.setItem(LAST_KEY, answer ? "1" : "0");
  } catch {
    /* no storage: kept for this visit only */
  }
}

/**
 * What the Plus answer will be, before it is asked: yes where this build
 * cannot sell Plus (getClientEntitlements answers OPEN_ENTITLEMENTS there,
 * every time), otherwise the last answer this device had, or null if it has
 * never had one.
 */
export function expectedPlusFeatures(): boolean | null {
  if (typeof window === "undefined") return null;
  if (!plusEnforcedFor(clientSurface())) return true;
  if (last !== undefined) return last;
  last = null;
  try {
    const kept = window.localStorage.getItem(LAST_KEY);
    if (kept === "1") last = true;
    else if (kept === "0") last = false;
  } catch {
    /* no storage: nothing kept */
  }
  return last;
}

const noSubscribe = () => () => {};

/**
 * expectedPlusFeatures for a component: read at its first render on the
 * client, null on the server and while the page hydrates, so the markup
 * agrees.
 */
export function useExpectedPlusFeatures(): boolean | null {
  return useSyncExternalStore(noSubscribe, expectedPlusFeatures, () => null);
}

export function usePlusFeatures(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const resolve = () =>
      void plusFeaturesNow().then((v) => {
        if (alive) setAllowed(v);
      });
    resolve();
    // Re-ask after a purchase, so a lock the reader just paid to lift goes.
    const off = onEntitlementsChanged(() => {
      shared = null;
      resolve();
    });
    return () => {
      alive = false;
      off();
    };
  }, []);
  return allowed;
}
