"use client";

// Checks for an unclaimed gift once per app open and shows the box.
//
// Mounted in the (app) layout beside the other bridges. Deliberately quiet:
// signed-out readers, readers with no gift, and any failure all render
// nothing, so this can never get between someone and the app.
//
// Why apiFetch and not a relative fetch: inside the native shell a relative
// /api call resolves to https://localhost, where app/api is stashed out of
// the static export and nothing answers. That is exactly how native push
// registration was silently broken, and a gift that only ever appears on the
// web would be the same bug wearing a different hat.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { GiftBox, type PendingGift } from "./GiftBox";

/** Session guard: one lookup per app open, not per client-side navigation. */
let checkedThisSession = false;

export function GiftBridge() {
  const [gift, setGift] = useState<PendingGift | null>(null);

  useEffect(() => {
    if (checkedThisSession) return;
    checkedThisSession = true;

    let alive = true;
    (async () => {
      try {
        const res = await apiFetch("/api/gifts/pending");
        if (!res.ok) return;
        const data = (await res.json()) as { gift: PendingGift | null };
        if (alive && data.gift) setGift(data.gift);
      } catch {
        // Never surface a gift-lookup failure. The gift stays unclaimed and
        // will be found on the next open.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!gift) return null;
  return <GiftBox gift={gift} onDone={() => setGift(null)} />;
}
