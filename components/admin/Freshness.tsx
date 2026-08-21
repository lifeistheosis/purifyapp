"use client";

// "Synced 12s ago", with a dot that goes amber when the feed is failing.
//
// The spec called for a freshness stamp on every panel, and the reason is the
// same one that made `estimated` worth surfacing on the revenue numbers: a
// figure with no age on it is indistinguishable from a figure that is current,
// and the moment those two look alike the panel starts lying politely. A live
// feed that cannot say how live it is has exactly that problem.
//
// It re-renders itself on a ticker rather than only when its parent does,
// because the whole point is that the label ages while you look at it. Without
// that, a panel polling every 60 seconds would read "just now" for a full
// minute and then jump.

import { useEffect, useState } from "react";
import { agoLabel } from "@/lib/admin/useLiveData";

export function Freshness({
  lastSynced,
  failing,
  onRefresh,
}: {
  lastSynced: Date | null;
  failing?: boolean;
  onRefresh?: () => void;
}) {
  const [, tick] = useState(0);

  useEffect(() => {
    // Five seconds is enough to keep the label honest without being a timer
    // that shows up in a profile.
    const id = setInterval(() => tick((n) => n + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  const tone = failing ? "var(--adm-warn)" : lastSynced ? "var(--adm-good)" : "var(--adm-ink-3)";

  return (
    <span className="inline-flex items-center gap-2 font-sans text-[12px]">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-[var(--adm-radius-pill)]"
        style={{ background: tone }}
      />
      <span style={{ color: "var(--adm-ink-3)" }}>
        {failing
          ? `Last good sync ${agoLabel(lastSynced)}, retrying`
          : `Synced ${agoLabel(lastSynced)}`}
      </span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="font-medium underline-offset-4 hover:underline focus-visible:underline"
          style={{ color: "var(--adm-ink-3)" }}
        >
          Refresh
        </button>
      )}
    </span>
  );
}
