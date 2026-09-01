"use client";

import { useMemo, useState } from "react";

import { Card, DataTable, Pill, StatCard, Email } from "../primitives";
import { useAdminFetch } from "../adminFetch";

/**
 * Who did what, and when.
 *
 * WHY THIS TAB EXISTS. lib/admin/activityLog.ts has been recording privileged
 * writes since 20260823 and nothing has ever read them back. Its own header
 * explains what is at stake: comping a subscription overwrites plus_until
 * rather than extending it and replaces plus_source, so a paying subscriber
 * loses the record that they ever paid. Refunds, store provisioning and
 * entitlement writes sit in the same category. All of it was written to a
 * table with no reader, which is the same as not having a log at all right up
 * until the moment somebody asks what happened.
 *
 * NOT A FEED, A RECORD. It is deliberately plain and filterable rather than
 * decorated: the question it answers is "show me every entitlement write last
 * Tuesday", and that is a table.
 */

type Entry = {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

type Payload = { entries: Entry[]; limit: number; truncated: boolean };

/** The verbs worth colouring. Everything else reads as ordinary. */
function toneFor(action: string): "rose" | "gold" | "emerald" | "neutral" {
  if (/refund|remove|delete|revoke|unverify|decline/.test(action)) return "rose";
  if (/comp|grant|entitle|verif|publish|pin/.test(action)) return "gold";
  if (/create|provision|add/.test(action)) return "emerald";
  return "neutral";
}

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The detail blob, as one readable line rather than raw JSON. */
function summarise(detail: Record<string, unknown> | null): string {
  if (!detail || typeof detail !== "object") return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(detail)) {
    if (v === null || v === undefined || v === "") continue;
    // Nested objects are rare here and unreadable inline; the row is a
    // pointer, and the full blob is one click away in the JSON column.
    parts.push(`${k}: ${typeof v === "object" ? "…" : String(v)}`);
  }
  return parts.join(" · ");
}

export function AuditLogTab() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (actor.trim()) p.set("actor", actor.trim());
    if (action.trim()) p.set("action", action.trim());
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [actor, action]);

  const { data, error, reload } = useAdminFetch<Payload>(
    `/api/admin/activity-log${qs}`,
  );

  // Memoised, so the `?? []` cannot hand useMemo a fresh array identity on
  // every render and defeat the memo it feeds.
  const entries = useMemo(() => data?.entries ?? [], [data]);
  const actors = useMemo(
    () => new Set(entries.map((e) => e.actor_email).filter(Boolean)).size,
    [entries],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entries shown" value={entries.length} accent />
        <StatCard label="Distinct admins" value={actors} />
        <StatCard
          label="Newest"
          value={entries[0] ? when(entries[0].created_at) : "—"}
        />
        <StatCard
          label="Oldest shown"
          value={entries.length ? when(entries[entries.length - 1].created_at) : "—"}
        />
      </div>

      {error && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error}
        </p>
      )}

      {data?.truncated && (
        <p className="font-sans text-detail text-[color:var(--adm-ink-3)]">
          Showing the newest {data.limit}. Narrow with the filters to see past
          them. This is not the whole log.
        </p>
      )}

      <Card
        title="Admin activity"
        subtitle="Every privileged write, with who made it. Filter by admin or by the start of an action name"
      >
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="min-w-[180px] flex-1">
            <span
              className="mb-1 block font-sans text-[11.5px]"
              style={{ color: "var(--adm-ink-3)" }}
            >
              Admin email
            </span>
            <input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="anyone"
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[13px] outline-none"
              style={{
                background: "var(--adm-control)",
                borderColor: "var(--adm-line)",
                color: "var(--adm-ink)",
              }}
            />
          </label>
          <label className="min-w-[180px] flex-1">
            <span
              className="mb-1 block font-sans text-[11.5px]"
              style={{ color: "var(--adm-ink-3)" }}
            >
              Action starts with
            </span>
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="shop., user., subscription."
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[13px] outline-none"
              style={{
                background: "var(--adm-control)",
                borderColor: "var(--adm-line)",
                color: "var(--adm-ink)",
              }}
            />
          </label>
        </div>

        <DataTable<Entry>
          csvFilename="admin-activity-log.csv"
          columns={[
            {
              key: "when",
              label: "When",
              render: (e) => (
                <span className="whitespace-nowrap text-paper/70">
                  {when(e.created_at)}
                </span>
              ),
              csv: (e) => e.created_at,
            },
            {
              key: "actor",
              label: "Admin",
              // Through <Email>, so streamer mode covers it like every other
              // address in the panel.
              render: (e) =>
                e.actor_email ? (
                  <Email value={e.actor_email} className="text-paper/85" />
                ) : (
                  <Pill tone="rose">unknown</Pill>
                ),
              csv: (e) => e.actor_email ?? "",
            },
            {
              key: "action",
              label: "Action",
              render: (e) => <Pill tone={toneFor(e.action)}>{e.action}</Pill>,
              csv: (e) => e.action,
            },
            {
              key: "entity",
              label: "On",
              render: (e) => (
                <span className="text-paper/70">
                  {e.entity_type}
                  {e.entity_id ? (
                    <span className="text-paper/40"> · {e.entity_id}</span>
                  ) : null}
                </span>
              ),
              csv: (e) => `${e.entity_type} ${e.entity_id ?? ""}`.trim(),
            },
            {
              key: "detail",
              label: "Detail",
              render: (e) => (
                <span className="text-paper/60">{summarise(e.detail)}</span>
              ),
              csv: (e) => JSON.stringify(e.detail ?? {}),
            },
          ]}
          rows={entries}
          rowKey={(e) => e.id}
          empty={
            actor || action
              ? "Nothing matches those filters."
              : "No admin activity recorded yet."
          }
        />

        <button
          type="button"
          onClick={reload}
          className="mt-3 font-sans text-[12px]"
          style={{ color: "var(--adm-ink-3)" }}
        >
          Refresh
        </button>
      </Card>
    </div>
  );
}
