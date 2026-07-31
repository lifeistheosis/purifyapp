"use client";

// Tells a Pro member, once per app open, that this month's box is claimable.
//
// A quiet card, not a modal: the gift reveal ceremony is for gifts, and an
// interruption is the wrong register for "your subscription benefit is
// ready". Signed-out readers, free readers, readers who already claimed,
// and any failure all render nothing.
//
// Why apiFetch and not a relative fetch: inside the native shell a relative
// /api call resolves to https://localhost, where app/api is stashed out of
// the static export and nothing answers. Same reason GiftBridge uses it.

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { dropIsOpen } from "@/lib/eikonBox/status";
import type { EikonBoxCurrent } from "@/lib/eikonBox/types";

/** Session guard: one lookup per app open, not per client-side navigation. */
let checkedThisSession = false;

const SEEN_KEY = "purify:eikonBoxSeen";
/** The cache usePremiumTier keeps, so free readers cost one call ever. */
const TIER_KEY = "purify:premiumTier";

export function EikonBoxBridge() {
  const [drop, setDrop] = useState<EikonBoxCurrent["drop"]>(null);

  useEffect(() => {
    if (!eikonBoxEnabled()) return;
    if (checkedThisSession) return;
    checkedThisSession = true;

    // A known-free reader never has a box to claim. Honest optimisation: a
    // stale "free" self-heals the moment usePremiumTier revalidates anywhere
    // else in the app, and the worst case is one missed card on one open.
    try {
      if (window.localStorage.getItem(TIER_KEY) === "free") return;
    } catch {
      /* storage may be unavailable */
    }

    let alive = true;
    (async () => {
      try {
        const res = await apiFetch("/api/eikon-box/current");
        if (!res.ok) return;
        const data = (await res.json()) as EikonBoxCurrent;
        if (!alive) return;
        if (!data.eligible || !data.drop || data.claim) return;
        if (!dropIsOpen(data.drop)) return;
        try {
          if (window.localStorage.getItem(SEEN_KEY) === data.drop.id) return;
        } catch {
          /* ignore */
        }
        setDrop(data.drop);
      } catch {
        // Never surface a lookup failure. The box stays claimable and will
        // be found on the next open.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!drop) return null;

  const deadline = drop.claimsCloseAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(drop.claimsCloseAt))
    : null;

  function dismiss() {
    try {
      // Per drop, so next month re-arms it.
      if (drop) window.localStorage.setItem(SEEN_KEY, drop.id);
    } catch {
      /* ignore */
    }
    setDrop(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+76px)] md:pb-5">
      <div className="mx-auto max-w-[420px] rounded-2xl border border-gold/35 bg-night/95 p-4 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/80">
            Purify Pro
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mt-1 -mr-1 h-7 w-7 shrink-0 rounded-pill text-paper/45 hover:text-paper"
          >
            ×
          </button>
        </div>
        <p className="mt-1.5 font-serif text-lede text-paper leading-snug">
          {drop.title} is open
        </p>
        <p className="mt-1 font-sans text-caption text-paper/60 leading-[1.55]">
          {deadline ? `Claim yours by ${deadline}. ` : ""}
          We gather each box to the number claimed.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Link
            href="/account/eikon-box"
            onClick={dismiss}
            className="inline-flex items-center rounded-pill bg-gold px-4 py-2 font-sans text-detail font-semibold text-night"
          >
            Claim your box
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="font-sans text-detail font-medium text-paper/55"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
