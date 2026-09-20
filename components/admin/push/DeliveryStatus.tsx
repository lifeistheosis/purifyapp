"use client";

// Can each push transport deliver right now: devices waiting on it, and, when
// it cannot, the variable to set or the part that cannot be read. Answers
// before a send instead of after one (app/api/admin/push/health). Shared by the
// Push tab and the EIKON Box tab, whose announcements ride the same transports.

import { useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";

import { Card, ToolbarButton } from "../primitives";

export type TransportHealth = {
  transport: "android" | "ios" | "web";
  label: string;
  devices: number | null;
  ready: boolean;
  missing: string[];
  problem: string | null;
};

type State = "ready" | "unset" | "unreadable" | "idle";

function stateOf(t: TransportHealth): State {
  if (t.ready) return "ready";
  if (t.missing.length) return t.devices === 0 ? "idle" : "unset";
  return "unreadable";
}

const WORD: Record<State, string> = {
  ready: "Ready",
  unset: "Not set up",
  unreadable: "Key unreadable",
  idle: "Not set up",
};

const TONE: Record<State, string> = {
  ready: "var(--adm-good)",
  unset: "var(--adm-warn)",
  unreadable: "var(--adm-critical)",
  idle: "var(--adm-ink-3)",
};

function detail(t: TransportHealth): string {
  const s = stateOf(t);
  if (s === "ready") return "Sends for real.";
  if (s === "unreadable") {
    return (
      t.problem ??
      "Its variables are set but one cannot be read. The server log names which."
    );
  }
  const names = t.missing.join(", ");
  return `Set ${names} on Render.`;
}

/** Fetch transport health. `null` while loading, `[]` when it could not be read. */
export function usePushHealth(reloadKey = 0): TransportHealth[] | null {
  const [rows, setRows] = useState<TransportHealth[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await adminJson<{ transports?: TransportHealth[] }>(
          "/api/admin/push/health"
        );
        if (alive) setRows(d?.transports ?? []);
      } catch {
        if (alive) setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);
  return rows;
}

export function DeliveryStatus({
  title = "Delivery",
  only,
}: {
  title?: string;
  /** Limit to some transports, e.g. the app-only EIKON Box audience. */
  only?: TransportHealth["transport"][];
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const all = usePushHealth(reloadKey);
  const rows = all?.filter((t) => !only || only.includes(t.transport)) ?? null;

  const known = rows?.filter((t) => t.devices !== null) ?? [];
  const total = known.reduce((n, t) => n + (t.devices ?? 0), 0);
  const reachable = known
    .filter((t) => t.ready)
    .reduce((n, t) => n + (t.devices ?? 0), 0);

  return (
    <Card
      title={title}
      subtitle={
        rows && rows.length
          ? `${reachable.toLocaleString()} of ${total.toLocaleString()} devices can be reached right now.`
          : "Whether each platform can deliver, before you send."
      }
      action={
        <ToolbarButton
          onClick={() => setReloadKey((k) => k + 1)}
          loading={rows === null}
        >
          Recheck
        </ToolbarButton>
      }
    >
      {rows === null ? (
        <p className="font-sans text-detail text-[color:var(--adm-ink-3)]">
          Checking…
        </p>
      ) : rows.length === 0 ? (
        <p className="font-sans text-detail text-[color:var(--adm-ink-3)]">
          Could not read delivery status. Try Recheck.
        </p>
      ) : (
        <div className="@container">
          <ul className="grid gap-2 @min-[560px]:grid-cols-3">
            {rows.map((t) => {
              const s = stateOf(t);
              return (
                <li
                  key={t.transport}
                  className="rounded-[var(--adm-radius)] border border-[color:var(--adm-line)] bg-[color:var(--adm-panel-2)] px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-sans text-detail font-semibold text-[color:var(--adm-ink)]">
                      {t.label}
                    </span>
                    <span className="font-sans text-caption tabular-nums text-[color:var(--adm-ink-3)]">
                      {t.devices === null ? "?" : t.devices.toLocaleString()}{" "}
                      {t.devices === 1 ? "device" : "devices"}
                    </span>
                  </div>
                  <p
                    className="mt-1 flex items-center gap-1.5 font-sans text-caption font-semibold"
                    style={{ color: TONE[s] }}
                  >
                    <span
                      aria-hidden
                      className="inline-block size-2 rounded-full"
                      style={{ background: TONE[s] }}
                    />
                    {WORD[s]}
                  </p>
                  <p className="mt-1 break-words font-sans text-caption leading-snug text-[color:var(--adm-ink-2)]">
                    {detail(t)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
