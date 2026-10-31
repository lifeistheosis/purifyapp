"use client";

// The record: the Audit log's second view (his pick B on r3-17, 2026-10-30,
// keeps A's timeline as it). "One record of who did what, the admin's and
// Community's moderation together, by day, newest first. Search any name,
// email, order or word; a switch narrows to Money, Shop, Readers, Community
// or Releases. A row opens to its detail in words, not only in the CSV."
//
// NOT A FEED, A RECORD. The question it answers is "show me every refund
// last Tuesday" or "who removed that reply", and it answers by searching
// what /api/admin/activity-log reads: the newest 200 admin actions
// (lib/admin/activityLog.ts) and the newest 100 lines of the moderation log.
// The lines are lib/admin/auditRecord.ts.

import { useMemo, useState } from "react";

import { KINDS, buildRecord, byDay, filterRecord, type ActivityEntry, type Kind, type ModLine } from "@/lib/admin/auditRecord";
import { downloadCsv, toCsv } from "@/lib/admin/csv";

import { useAdminFetch } from "../adminFetch";
import { Email, SubTabs, ToolbarButton } from "../primitives";
import { BOX, BOX_STYLE, ink, ink2, ink3, line } from "../tools/look";

type Payload = {
  entries: ActivityEntry[];
  limit: number;
  truncated: boolean;
  mod?: ModLine[];
  modReadable?: boolean;
  me?: string | null;
};

type Switch = "All" | Kind;

export function AuditLogTab() {
  const { data, error, reload } = useAdminFetch<Payload>("/api/admin/activity-log");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Switch>("All");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => (data ? buildRecord(data.entries, data.mod ?? [], data.me ?? null) : []), [data]);
  const shown = filterRecord(rows, query, kind);
  const days = byDay(shown, new Date());

  function csv() {
    downloadCsv(
      "admin-record.csv",
      toCsv(
        ["when", "who", "what", "kind", "detail"],
        shown.map((r) => [r.at, r.email ?? r.who, r.what, r.kind, r.detail.map(([k, v]) => `${k}: ${v}`).join("; ")]),
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-[34px] min-w-[14rem] flex-1 items-center gap-2 rounded-[var(--adm-radius-sm)] border px-2.5" style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)" }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden style={ink3}>
            <circle cx="9" cy="9" r="5.6" />
            <path d="M13.2 13.2 17 17" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a name, an email, an order or a word"
            aria-label="Search the record"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-sans text-[13px] outline-none"
            style={ink}
          />
        </label>
        <div className="hidden lg:block">
          <SubTabs<Switch> tabs={[["All", "All"], ...KINDS.map((k) => [k, k] as const)]} active={kind} onChange={setKind} />
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Switch)}
          aria-label="Which kind"
          className="h-[34px] rounded-[var(--adm-radius-sm)] border px-2 font-sans text-[12.5px] lg:hidden"
          style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
        >
          <option value="All">All kinds</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <ToolbarButton onClick={csv}>CSV</ToolbarButton>
      </div>

      {error ? (
        <p role="alert" className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          The record could not be read. If the audit log table is not on this database yet,
          supabase/migrations/20260823000000_admin_activity_log.sql has not been applied.
        </p>
      ) : null}
      {data?.truncated ? (
        <p className="font-sans text-[12px]" style={ink3}>
          The newest {data.limit} admin actions are here, not the whole log; search narrows within them.
        </p>
      ) : null}
      {data && data.modReadable === false ? (
        <p className="font-sans text-[12px]" style={ink3}>
          Community&apos;s moderation log did not answer, so its lines are missing below.
        </p>
      ) : null}

      {!data && !error ? (
        <p className="font-sans text-[12.5px]" style={ink3}>
          Reading the record.
        </p>
      ) : data && shown.length === 0 ? (
        <p className={`${BOX} px-4 py-3 font-sans text-[12.5px]`} style={{ ...BOX_STYLE, ...ink3 }}>
          {query || kind !== "All" ? "Nothing matches." : "Nothing recorded yet."}
        </p>
      ) : (
        <div className={BOX} style={BOX_STYLE}>
          {days.map((d, di) => (
            <section key={d.day}>
              <p className={`px-4 pb-1.5 pt-2.5 font-sans text-[11.5px] font-semibold ${di ? "border-t" : ""}`} style={{ ...line, ...ink2 }}>
                {d.day}
              </p>
              <ul>
                {d.rows.map((r) => {
                  const isOpen = open === r.id;
                  return (
                    <li key={r.id} className="border-t" style={line}>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : r.id)}
                        aria-expanded={isOpen}
                        className="grid min-h-11 w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2 text-left font-sans text-[13px] md:grid-cols-[3rem_9rem_minmax(0,1fr)_auto_14px]"
                        style={isOpen ? { background: "var(--adm-panel-2)" } : undefined}
                      >
                        <span className="font-mono text-[12px]" style={ink3}>
                          {new Date(r.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                        <span className="hidden truncate font-semibold md:block" style={ink}>
                          {r.you || !r.email ? r.who : <Email value={r.email} />}
                        </span>
                        <span className="min-w-0" style={ink2}>
                          <span className="font-semibold md:hidden" style={ink}>
                            {r.you || !r.email ? r.who : <Email value={r.email} />}{" "}
                          </span>
                          <span className="adm-sensitive">{r.what}</span>
                        </span>
                        <span
                          className="rounded-[var(--adm-radius-xs)] px-1.5 font-sans text-[11.5px] font-medium"
                          style={{ background: "var(--adm-panel-2)", color: "var(--adm-ink-2)" }}
                        >
                          {r.kind}
                        </span>
                        <span aria-hidden className="hidden md:block" style={ink3}>
                          {isOpen ? "⌄" : "›"}
                        </span>
                      </button>
                      {isOpen ? (
                        <dl className="adm-sensitive grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-4 pb-3 pt-1 font-mono text-[11.5px] md:pl-[13.5rem]" style={{ background: "var(--adm-panel-2)" }}>
                          {r.detail.length === 0 ? (
                            <dd className="col-span-2" style={ink3}>
                              Nothing more was recorded.
                            </dd>
                          ) : (
                            r.detail.map(([k, v], i) => (
                              <div key={`${k}${i}`} className="contents">
                                <dt style={ink3}>{k}</dt>
                                <dd className="break-all" style={ink2}>
                                  {v}
                                </dd>
                              </div>
                            ))
                          )}
                        </dl>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {data ? (
        <button type="button" onClick={reload} className="min-h-11 font-sans text-[12px] underline underline-offset-[3px]" style={ink3}>
          Read it again
        </button>
      ) : null}
    </div>
  );
}
