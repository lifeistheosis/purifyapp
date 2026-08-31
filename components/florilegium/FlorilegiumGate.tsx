"use client";

import { useEffect, useState } from "react";

import { FlorilegiaHub } from "@/components/florilegium/FlorilegiaHub";
import { FlorilegiumDetail } from "@/components/florilegium/FlorilegiumDetail";
import { PlusGate } from "@/components/florilegium/PlusGate";
import { getClientEntitlements } from "@/lib/entitlements/client";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";

/**
 * Resolves the Florilegium's entitlement AT RUNTIME, not at render time on the
 * server.
 *
 * WHY. The page was an async server component calling getEntitlements(). On the
 * web that is fine. In the native app it is not, and the failure is silent:
 * lib/platform/nativeRequest.ts:20 returns false when IS_STATIC_EXPORT, so
 * during `npm run build:android` the server asks plusEnforcedFor("web") rather
 * than ("android"), and whatever that answered gets baked into the bundled
 * index.html with no runtime re-check. Two consequences, both bad. The Android
 * build would gate on the WEB launch switch, which is a different flag with a
 * different launch date. And a reader who buys Plus inside the app would still
 * see the gate, because the HTML deciding it shipped weeks earlier.
 *
 * This is the pattern AGENTS.md describes for every native surface, a server
 * shell for metadata plus a client child that reads at runtime, and it is what
 * HistoryTimelinePage.tsx:98 already does for the same entitlement.
 *
 * The loading state renders the hub, not the gate. Erring open leaves a
 * non-subscriber with a second of something they will lose; erring closed
 * flashes a paywall at a paying subscriber every time they open the page, which
 * is the worse of the two and the one readers report.
 */
export function FlorilegiumGate({ detailId }: { detailId?: string }) {
  const [entitled, setEntitled] = useState(true);

  useEffect(() => {
    let alive = true;
    const resolve = () =>
      getClientEntitlements().then((e) => {
        if (alive) setEntitled(e.plusFeatures);
      });
    void resolve();
    // Re-ask after a purchase, so the hub the reader just paid for is not still
    // showing them the pitch card behind the confirmation.
    const off = onEntitlementsChanged(() => void resolve());
    return () => {
      alive = false;
      off();
    };
  }, []);

  if (!entitled) {
    return (
      <PlusGate
        titleKey="plus.florilegium.title"
        blurbKey="plus.florilegium.body"
        modalFeature="florilegium"
      />
    );
  }
  return detailId ? <FlorilegiumDetail id={detailId} /> : <FlorilegiaHub />;
}
