"use client";

// Can the EIKON Box actually run right now: the member switch, the tables, an
// open drop, members to claim it, and a way to tell them. Each part fails
// quietly on its own, so they are read together, before a drop is announced.

import { useCallback, useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";

import { Card, ToolbarButton } from "../primitives";

type Transport = {
  transport: "android" | "ios" | "web";
  label: string;
  devices: number;
  ready: boolean;
  missing: string[];
  problem: string | null;
};

export type Readiness = {
  memberSide: boolean;
  tables: boolean;
  tablesError: string | null;
  drops: {
    total: number;
    open: { id: string; title: string; closesAt: string | null } | null;
    next: { id: string; title: string; periodMonth: string } | null;
  };
  pro: number;
  push: { transports: Transport[]; errors: string[] };
  email: { enabled: boolean; leftToday: number };
};

type State = "ok" | "warn" | "blocked";

const TONE: Record<State, string> = {
  ok: "var(--adm-good)",
  warn: "var(--adm-warn)",
  blocked: "var(--adm-critical)",
};

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;

function pushLine(t: Transport): string {
  if (t.ready) return `${t.label}: ${t.devices} device${t.devices === 1 ? "" : "s"}, ready.`;
  if (t.missing.length) return `${t.label}: ${t.devices} device${t.devices === 1 ? "" : "s"}, set ${t.missing.join(", ")}.`;
  return `${t.label}: ${t.devices} device${t.devices === 1 ? "" : "s"}. ${t.problem ?? "Its keys cannot be read."}`;
}

function checks(r: Readiness): { label: string; state: State; detail: string }[] {
  const reach = r.push.transports.filter((t) => t.ready).reduce((n, t) => n + t.devices, 0);
  const devices = r.push.transports.reduce((n, t) => n + t.devices, 0);
  const closes = r.drops.open?.closesAt ? new Date(r.drops.open.closesAt).toLocaleDateString() : null;
  return [
    {
      label: "Members can see it",
      state: r.memberSide ? "ok" : "blocked",
      detail: r.memberSide
        ? "The box shows in the app and on the site for Pro members."
        : "NEXT_PUBLIC_EIKON_BOX_ENABLED is not set, so every member screen says opening soon and the member routes answer 404. Set it to 1 on Render and redeploy; the apps read the same name as a GitHub secret when they build.",
    },
    {
      label: "Tables",
      state: r.tables ? "ok" : "blocked",
      detail: r.tables ? "Drops and claims are readable." : (r.tablesError ?? "The drop tables cannot be read."),
    },
    {
      label: "A drop is open",
      state: r.drops.open ? "ok" : "warn",
      detail: r.drops.open
        ? `${r.drops.open.title} is open${closes ? `, claims close ${closes}` : ""}.`
        : r.drops.next
          ? `${r.drops.next.title} is still a draft. Open it when you are ready.`
          : "No drop exists yet. Create one for this month under Drops.",
    },
    {
      label: "Members who can claim",
      state: r.pro > 0 ? "ok" : "warn",
      detail: r.pro > 0 ? `${r.pro} active Pro member${r.pro === 1 ? "" : "s"}.` : "Nobody has Pro, so nobody can claim a box.",
    },
    {
      label: "Push to those members",
      state: devices === 0 ? "warn" : reach === devices ? "ok" : reach > 0 ? "warn" : "blocked",
      detail:
        devices === 0
          ? "None of them have a device registered for push."
          : `${reach} of ${devices} of their devices can be reached. ${r.push.transports
              .filter((t) => t.devices > 0)
              .map(pushLine)
              .join(" ")}`,
    },
    {
      label: "Email to those members",
      state: r.email.enabled ? (r.email.leftToday >= r.pro ? "ok" : "warn") : "blocked",
      detail: r.email.enabled
        ? `${r.email.leftToday} email${r.email.leftToday === 1 ? "" : "s"} left today, and the announcement needs ${r.pro}.`
        : "No email provider is configured (RESEND_API_KEY), so the announcement email is skipped.",
    },
  ];
}

export function ReadinessCard() {
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await adminJson<Readiness>("/api/admin/eikon-box/readiness");
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the mount
       read shares its path with Recheck; every write is past an await. */
    void load();
  }, [load]);

  const rows = data ? checks(data) : [];
  const blocked = rows.filter((c) => c.state === "blocked").length;

  return (
    <Card
      title="Can it run"
      subtitle={
        data
          ? blocked === 0
            ? "Everything the box needs is in place."
            : `${blocked === 1 ? "One thing stops" : `${blocked} things stop`} a drop from reaching anyone.`
          : "Checking the box end to end…"
      }
      action={
        <ToolbarButton onClick={load} loading={loading}>
          Recheck
        </ToolbarButton>
      }
    >
      {data && (
        <div className="@container">
          <ul className="grid gap-2 @min-[680px]:grid-cols-2">
            {rows.map((c) => (
              <li
                key={c.label}
                className="rounded-[var(--adm-radius)] border px-3 py-2.5"
                style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
              >
                <p className="flex items-center gap-1.5 font-sans text-[12.5px] font-semibold" style={ink}>
                  <span
                    aria-hidden
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ background: TONE[c.state] }}
                  />
                  {c.label}
                </p>
                <p className="mt-1 font-sans text-[12px] leading-snug" style={ink2}>
                  {c.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
