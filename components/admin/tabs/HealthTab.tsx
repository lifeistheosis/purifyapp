"use client";

// Service Health tab: dependency probes, internal and outbound. Nothing is
// persisted; Re-probe asks again.
//
// TWO SOURCES, BOTH ALREADY IN HAND. The attention strip reads the internal
// probes (Supabase, the rate limiter) through liveStore every five minutes,
// and the outbound probes (API.Bible, Buy Me a Coffee, ipwho.is, Render) once
// per page load through a small once-store, because one of those is a live
// call to a licensed, metered API. This tab used to subscribe to a THIRD URL,
// the unscoped route running all six, which spent a second API.Bible call
// the moment Services was opened and another every thirty minutes it stayed
// open. Now it composes the two reads the strip already holds and adds no
// request of its own; Re-probe is the explicit Retry the once-store allows.
//
// A failed read says so. The old version rendered "Probing…" for ever on an
// expired session, and the copy that replaced it named a Re-probe button that
// only existed inside a card the failure branch never rendered.

import { useState } from "react";

import { readLive } from "@/lib/admin/liveStore";
import { useLiveData } from "@/lib/admin/useLiveData";
import { refreshOutbound, useOutboundProbe } from "@/lib/admin/useAttention";
import { SOURCE_URL } from "@/lib/admin/attention";
import { Card, Pill, Toolbar, ToolbarButton } from "../primitives";

type Probe = {
  service: string;
  status: "ok" | "fail" | "skipped";
  detail: string;
  latencyMs: number | null;
};

type Payload = {
  probes: Probe[];
  generatedAt: string;
};

const isPayload = (d: unknown): d is Payload =>
  typeof d === "object" && d !== null && Array.isArray((d as { probes?: unknown }).probes);

export function HealthTab() {
  const internal = useLiveData<Payload>(SOURCE_URL.internal, 300_000);
  const outbound = useOutboundProbe();
  const outboundData = isPayload(outbound.data) ? outbound.data : null;

  // In-flight state is local. The store's `loading` means "never answered",
  // which is right for the first paint and wrong for a Re-probe: it never
  // went true again, so the button never showed the seconds a six-service
  // probe takes and a failed re-probe was presented as a current result.
  const [busy, setBusy] = useState(false);
  const reprobe = () => {
    setBusy(true);
    void Promise.all([readLive(SOURCE_URL.internal), refreshOutbound()]).finally(() =>
      setBusy(false),
    );
  };

  const probes: Probe[] = [...(internal.data?.probes ?? []), ...(outboundData?.probes ?? [])];
  const anyData = probes.length > 0;
  const anyFailedRead = internal.failing || outbound.failing;
  const stillLoading = internal.loading || outbound.loading;

  const failing = probes.filter((p) => p.status === "fail").length;
  const ok = probes.filter((p) => p.status === "ok").length;
  const skipped = probes.filter((p) => p.status === "skipped").length;
  const probedAt = [internal.data?.generatedAt, outboundData?.generatedAt]
    .filter((s): s is string => typeof s === "string")
    .sort()
    .pop();

  const subtitle = anyData
    ? `OK ${ok} · Failing ${failing} · Skipped ${skipped}${
        probedAt ? ` · Probed ${new Date(probedAt).toLocaleTimeString()}` : ""
      }${anyFailedRead ? " · one of the two reads did not answer" : ""}`
    : anyFailedRead
      ? "The probes did not answer."
      : "Probing…";

  return (
    <div className="space-y-6">
      <Card
        title="Services"
        subtitle={subtitle}
        accent={failing > 0}
        action={
          <Toolbar>
            <ToolbarButton onClick={reprobe} loading={busy}>
              {busy ? "Probing…" : "Re-probe"}
            </ToolbarButton>
          </Toolbar>
        }
      >
        {anyData ? (
          <ul className="divide-y divide-paper/[0.06]">
            {probes.map((p) => (
              <li
                key={p.service}
                className="py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="font-sans text-ui font-semibold text-paper">
                    {p.service}
                  </p>
                  <p className="font-mono text-eyebrow text-paper/55 truncate max-w-[640px]">
                    {p.detail}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-sans text-caption tabular-nums text-paper/55">
                    {p.latencyMs !== null ? `${p.latencyMs}ms` : "—"}
                  </span>
                  {p.status === "ok" && <Pill tone="emerald">OK</Pill>}
                  {p.status === "fail" && <Pill tone="rose">Fail</Pill>}
                  {p.status === "skipped" && <Pill tone="neutral">Skipped</Pill>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center font-sans text-detail" style={{ color: "var(--adm-ink-3)" }}>
            {anyFailedRead
              ? "The probes did not answer. Re-probe asks again."
              : stillLoading
                ? "Probing…"
                : "No probes were returned."}
          </p>
        )}
      </Card>

      <Card title="Notes" subtitle="What each probe tells you, and what is missing.">
        <ul className="space-y-2 font-sans text-detail text-paper/85">
          <li>
            <strong>Supabase</strong>: service-role select against{" "}
            <span className="font-mono text-caption">profiles</span>. A fail means the database is
            unreachable or the service-role key is wrong.
          </li>
          <li>
            <strong>Rate limiter</strong>: calls the{" "}
            <span className="font-mono text-caption">rate_limit_hit</span> RPC. The limiter is fail-open,
            so a fail here means about thirty write routes are accepting requests without a limit.
          </li>
          <li>
            <strong>API.Bible</strong>: hits <span className="font-mono text-caption">/v1/bibles</span>{" "}
            with the publisher key. A fail disables NKJV, NIV and NLT reading and risks the FUMS
            contract. This is a licensed call, which is why it is probed once per page load and
            on Re-probe only.
          </li>
          <li>
            <strong>Buy Me a Coffee</strong>: hits{" "}
            <span className="font-mono text-caption">/supporters</span>. The Costs tab and /support
            fall back to the static figure when this fails.
          </li>
          <li>
            <strong>ipwho.is</strong>: geo enrichment for analytics sessions. A fail means new
            sessions store no country or region.
          </li>
          <li>
            <strong>Render</strong>: pulls the latest deploy status and commit. Skipped when{" "}
            <span className="font-mono text-caption">RENDER_API_KEY</span> or{" "}
            <span className="font-mono text-caption">RENDER_SERVICE_ID</span> is not set.
          </li>
        </ul>
      </Card>
    </div>
  );
}
