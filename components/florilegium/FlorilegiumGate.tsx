"use client";

import { useEffect, useState, type ReactNode } from "react";

import { FlorilegiaHub } from "@/components/florilegium/FlorilegiaHub";
import { FlorilegiumDetail } from "@/components/florilegium/FlorilegiumDetail";
import { PlusGate } from "@/components/florilegium/PlusGate";
import { getClientEntitlements } from "@/lib/entitlements/client";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";
import { useExpectedPlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { useFlorilegia } from "@/lib/florilegium/florilegium";
import { useMounted } from "@/lib/useMounted";

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
 *
 * From 1.9 (ideas.json c-flor-gate-flash) it errs with what this device last
 * knew (useExpectedPlusFeatures): a reader the device last knew without Plus
 * meets the card at once, not the hub for a second first; a subscriber, or a
 * device that never asked, still opens on the hub. The live answer decides.
 *
 * A reader whose Plus has lapsed still reads what they gathered (1.9, rec 10,
 * ideas.json c-flor-gate-flash, the other half): the card, and under it their
 * own gatherings as this device keeps them, read-only: no new gathering, no
 * starters, no notes, nothing removed, nothing handed on. One gathering opens
 * the same way, its lines first and the card under them. A reader with
 * nothing gathered meets the card alone, as before.
 */
export function FlorilegiumGate({ detailId }: { detailId?: string }) {
  const expected = useExpectedPlusFeatures();
  const [answer, setAnswer] = useState<boolean | null>(null);
  const entitled = answer ?? expected ?? true;

  useEffect(() => {
    let alive = true;
    const resolve = () =>
      getClientEntitlements().then((e) => {
        if (alive) setAnswer(e.plusFeatures);
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
    const gate = <PlusGate titleKey="plus.florilegium.title" blurbKey="plus.florilegium.body" modalFeature="florilegium" />;
    return <KeptReadOnly gate={gate} detailId={detailId} />;
  }
  return detailId ? <FlorilegiumDetail id={detailId} /> : <FlorilegiaHub />;
}

/** Without Plus: the card, and the reader's own gatherings under it to read, if this device keeps any. */
function KeptReadOnly({ gate, detailId }: { gate: ReactNode; detailId?: string }) {
  const { florilegia } = useFlorilegia();
  const mounted = useMounted();
  if (!mounted || florilegia.length === 0) return <>{gate}</>;
  if (detailId) {
    return (
      <div data-florilegium-read-only="">
        <FlorilegiumDetail id={detailId} readOnly />
        {gate}
      </div>
    );
  }
  return (
    <div data-florilegium-read-only="">
      {gate}
      <FlorilegiaHub readOnly />
    </div>
  );
}
