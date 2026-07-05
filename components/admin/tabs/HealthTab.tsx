"use client";

// Service Health tab — outbound dependency probes. On-demand, nothing
// persisted. Click "Re-probe" to re-run.

import { useEffect, useState, useTransition } from "react";
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

export function HealthTab() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/health", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reload()
       flips its loading flag synchronously by design; the initial probe on
       mount shares the same path as the Reload button. */
    reload();
  }, []);

  if (!data) {
    return <p className="font-sans text-detail text-paper/40 py-8 text-center">Probing…</p>;
  }

  const failing = data.probes.filter((p) => p.status === "fail").length;
  const ok = data.probes.filter((p) => p.status === "ok").length;
  const skipped = data.probes.filter((p) => p.status === "skipped").length;

  return (
    <div className="space-y-6">
      <Card
        title="Outbound services"
        subtitle={`OK ${ok} · Failing ${failing} · Skipped ${skipped} · Probed ${new Date(data.generatedAt).toLocaleTimeString()}`}
        accent={failing > 0}
        action={
          <Toolbar>
            <ToolbarButton onClick={() => startTransition(() => reload())} loading={loading}>
              {loading ? "Probing…" : "Re-probe"}
            </ToolbarButton>
          </Toolbar>
        }
      >
        <ul className="divide-y divide-paper/[0.06]">
          {data.probes.map((p) => (
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
      </Card>

      <Card title="Notes" subtitle="What each probe tells you, and what's missing.">
        <ul className="space-y-2 font-sans text-detail text-paper/85">
          <li>
            <strong>Supabase</strong> — service-role select against{" "}
            <span className="font-mono text-caption">profiles</span>. Fails mean the DB is unreachable or the service-role key is wrong.
          </li>
          <li>
            <strong>API.Bible</strong> — hits <span className="font-mono text-caption">/v1/bibles</span> with the publisher key. A fail here disables NKJV/NIV/NLT reading and risks the FUMS contract.
          </li>
          <li>
            <strong>Buy Me a Coffee</strong> — hits <span className="font-mono text-caption">/supporters</span>. The Sustainability tab and /support fall back to the static figure when this fails.
          </li>
          <li>
            <strong>ipwho.is</strong> — geo enrichment for analytics_sessions. Fail = new sessions store null country/region rows.
          </li>
          <li>
            <strong>Render</strong> — pulls the latest deploy status + commit short SHA. Skipped if{" "}
            <span className="font-mono text-caption">RENDER_API_KEY</span> /{" "}
            <span className="font-mono text-caption">RENDER_SERVICE_ID</span> aren&rsquo;t set.
          </li>
        </ul>
      </Card>
    </div>
  );
}
