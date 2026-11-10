"use client";

/**
 * Chant recordings (admin item A7), under its one line on the Content desk:
 * every recording the live list names, on or taken down, and the switch.
 * Taking one down keeps a few words of why; every app stops playing it, and
 * takes a saved copy off the phone, within minutes (lib/chants/pulls.ts).
 */

import { useState } from "react";

import type { ChantPullsPayload, ChantRecording } from "@/app/api/admin/chant-pulls/route";

import { useAdminFetch } from "../adminFetch";
import { Skeleton, StatusDot, ToolbarButton } from "../primitives";

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;
const line = { borderColor: "var(--adm-line)" } as const;

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function Row({ r, onChanged, canSwitch }: { r: ChantRecording; onChanged: () => void; canSwitch: boolean }) {
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function send(pulled: boolean) {
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/admin/chant-pulls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pulled ? { ref: r.ref, pulled, reason: reason.trim() } : { ref: r.ref, pulled }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setProblem(j?.error ?? "Not switched.");
        return;
      }
      setAsking(false);
      setReason("");
      onChanged();
    } catch {
      setProblem("Not switched: the admin could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-2.5" style={line}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StatusDot tone={r.pulled ? "bad" : "good"} />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[12.5px] font-medium" style={ink}>
            {r.chant} <span style={ink3}>· {r.variant}</span>
          </p>
          <p className="font-sans text-[11.5px]" style={ink3}>
            {r.pulled
              ? `Taken down ${day(r.pulledAt)}${r.changedBy ? ` by ${r.changedBy}` : ""}${r.reason ? `: ${r.reason}` : ""}`
              : r.performer
                ? r.performer
                : "Playing"}
            {!r.pulled && r.restoredAt ? ` · back since ${day(r.restoredAt)}` : ""}
          </p>
        </div>
        {canSwitch ? (
          r.pulled ? (
            <ToolbarButton onClick={() => send(false)} loading={busy}>
              Put it back
            </ToolbarButton>
          ) : asking ? null : (
            <ToolbarButton variant="danger" onClick={() => setAsking(true)}>
              Take down
            </ToolbarButton>
          )
        ) : null}
      </div>
      {asking && !r.pulled ? (
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(true);
          }}
        >
          <label className="sr-only" htmlFor={`why-${r.ref}`}>
            Why it is taken down
          </label>
          <input
            id={`why-${r.ref}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Why, in a few words"
            className="min-h-11 min-w-0 flex-1 rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]"
            style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
          />
          <ToolbarButton variant="danger" onClick={() => send(true)} loading={busy}>
            Take it down everywhere
          </ToolbarButton>
          <ToolbarButton onClick={() => setAsking(false)}>Not now</ToolbarButton>
        </form>
      ) : null}
      {problem ? (
        <p role="alert" className="mt-1.5 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
          {problem}
        </p>
      ) : null}
    </li>
  );
}

export function ChantPullsDetail() {
  const { data, error, reload } = useAdminFetch<ChantPullsPayload>("/api/admin/chant-pulls");
  if (error) return <p className="font-sans text-[12.5px]" style={ink2}>{error}</p>;
  if (!data) return <Skeleton h={160} />;
  return (
    <div className="space-y-3">
      <p className="max-w-[72ch] font-sans text-[12.5px] leading-[1.55]" style={ink2}>
        {data.absent
          ? "The switch is not set up yet: its table comes with the 1.9 release. Until then a recording is taken down by moving it from live to pulled in data/chants-live.json and pushing the website."
          : data.unavailable
            ? "The switches could not be read just now. The list every app reads is unchanged."
            : "A recording taken down here stops in every app within minutes, and a copy saved on a phone is taken off it. Nothing to release."}
      </p>
      <ul className="divide-y border-y" style={line}>
        {data.recordings.map((r) => (
          <Row key={r.ref} r={r} onChanged={reload} canSwitch={!data.absent && !data.unavailable} />
        ))}
      </ul>
    </div>
  );
}
