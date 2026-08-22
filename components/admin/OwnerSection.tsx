"use client";

// The owner content, loaded only for people the server agrees are owners.
//
// THIS FILE EXISTS FOR ONE REASON. Folding /owner into /admin created a leak
// that no gate in the old arrangement had to think about. OwnerDashboard
// imports data/market/markets.ts, lib/owner/projection.ts and
// lib/owner/actuals.ts. All three are pure modules, so they compile into
// whatever client bundle references them. While the dashboard lived at its
// own route behind a 404, that bundle was only ever served to owners. Import
// it directly from AdminShell and the market table, the scenario set and the
// projection maths ship to every admin's browser, whether or not
// OWNER_EMAILS contains them.
//
// Passing an `isOwner` boolean down from the server does NOT fix that. The
// boolean decides what renders; the bundler decides what ships, and it made
// its decision at build time. A static import is in the chunk either way.
//
// So the import is dynamic AND it is gated on a request, in that order:
//
//   1. Ask /api/owner/actuals, which runs getOwnerUser() server-side.
//   2. Only if that returns 200, import() the dashboard.
//
// A non-owner gets a 403 at step 1 and step 2 never runs, so the chunk is
// never requested and the model never lands on their machine. This is
// checkable, and it is worth checking the right way: open the network panel
// as a non-owner admin and confirm no owner chunk appears. Reading the
// source proves nothing, because the failure mode here is a bundler
// decision, not a code path.
//
// The fetched payload is handed to the dashboard as `initial` so the gate
// costs no extra request.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { adminJson } from "@/lib/admin/fetchJson";
import { Skeleton } from "./primitives";

// Type-only, so TypeScript erases it and the module never reaches the
// bundle. `import type` is the one way to name a shape from a gated
// module without shipping the module.
import type { Actuals } from "@/lib/owner/actuals";

type Panel = "today" | "model" | "markets";
type ActualsPayload = { actuals: Actuals; ownerListIsExplicit: boolean };

const OwnerDashboard = dynamic(
  () => import("@/components/owner/OwnerDashboard").then((m) => m.OwnerDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <Skeleton w="100%" h={120} />
        <Skeleton w="100%" h={220} />
      </div>
    ),
  },
);

export function OwnerSection({
  ownerEmail,
  panel,
}: {
  ownerEmail: string;
  panel: Panel;
}) {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");
  const [payload, setPayload] = useState<ActualsPayload | null>(null);

  useEffect(() => {
    let alive = true;
    adminJson<ActualsPayload>("/api/owner/actuals").then((d) => {
      if (!alive) return;
      if (!d) {
        setState("denied");
        return;
      }
      setPayload(d);
      setState("allowed");
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="space-y-3">
        <Skeleton w={220} h={16} />
        <Skeleton w="100%" h={180} />
      </div>
    );
  }

  if (state === "denied") {
    // adminJson returns null for a 403 and for a network failure alike, so
    // this cannot honestly say which happened. It says what is true either
    // way and offers the retry that distinguishes them.
    return (
      <div
        className="rounded-[var(--adm-radius)] border p-6 text-center"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
      >
        <p className="font-sans text-[13px] font-medium" style={{ color: "var(--adm-ink)" }}>
          Owner data is not available on this account.
        </p>
        <p className="mx-auto mt-2 max-w-[46ch] font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Either this address is not in OWNER_EMAILS, or the request did not
          reach the server. Reloading tells you which.
        </p>
      </div>
    );
  }

  return (
    <OwnerDashboard
      ownerEmail={ownerEmail}
      panel={panel}
      embedded
      initial={payload}
    />
  );
}
