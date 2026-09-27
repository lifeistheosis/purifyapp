"use client";

// The Plus gate for the Discord Plus custom mode. The same resolution as
// the reading palettes (components/reader/usePlusReadingModes.ts): while
// the surface's enforcement flag is off the answer is "allowed" at once;
// once it is on, the account's plusFeatures decides, and a reader still
// resolving is neither allowed nor shown a lock.

import { useEffect, useState } from "react";

import { plusEnforcedFor } from "@/lib/entitlements/entitlements";
import { getClientEntitlements, clientSurface } from "@/lib/entitlements/client";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";

export function usePlusCustom(): { allowed: boolean; locked: boolean } {
  const enforced = plusEnforcedFor(clientSurface());
  const [gate, setGate] = useState(() => (enforced ? { allowed: false, locked: false } : { allowed: true, locked: false }));

  useEffect(() => {
    if (!enforced) return;
    let cancelled = false;
    const resolve = () =>
      getClientEntitlements()
        .then((e) => {
          if (!cancelled) setGate({ allowed: e.plusFeatures, locked: !e.plusFeatures });
        })
        .catch(() => {
          if (!cancelled) setGate({ allowed: false, locked: true });
        });
    void resolve();
    const off = onEntitlementsChanged(() => void resolve());
    return () => {
      cancelled = true;
      off();
    };
  }, [enforced]);

  return gate;
}
