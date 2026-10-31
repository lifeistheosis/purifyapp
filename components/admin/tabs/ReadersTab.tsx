"use client";

/**
 * Users: the readers' directory, the owner's pick C on sheet r3-15
 * (2026-10-30): "Let's do C for users."
 *
 * Every account in one list. Find one by email, @handle or name; filter by
 * when they joined, how they sign in, their plan, their marks, or who is
 * waiting on him; open a reader and their card does the rest (the blue
 * check, the clergy seal, a badge, comped Plus, a gift). Verification and
 * Badges are no longer pages of their own: an old link to Verification opens
 * this list with Waiting on you on, an old link to Badges with the readers
 * who hold one. The rail still counts the waiting.
 *
 * On a phone the card is a screen of its own, with the way back to the list
 * at its top, as the sheet drew it.
 */

import { useEffect, useRef, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { downloadCsv, toCsv } from "@/lib/admin/csv";
import {
  badgeLabel,
  JOINED_OPTIONS,
  MARK_OPTIONS,
  marksOf,
  PLAN_OPTIONS,
  planWord,
  PROVIDER_LABEL,
  PROVIDER_OPTIONS,
  type Joined,
  type MarksFilter,
  type PlanFilter,
  type Provider,
  type Reader,
} from "@/lib/admin/readers";
import { SENSITIVE } from "@/lib/admin/streamer";
import { readViewIntent } from "@/lib/admin/viewIntent";

import { useAdminFetch } from "../adminFetch";
import { Panel, Quiet, Segmented } from "../daily/parts";
import { StatusDot } from "../primitives";
import { Select } from "../Select";
import { ReaderCard } from "./ReaderCard";

type Payload = {
  total: number;
  matched: number;
  waiting: number;
  offset: number;
  pageSize: number;
  rows: Reader[];
  summary?: { joinedToday: number; joined30: number; signedIn7: number; providers: Record<Provider, number> };
  missing: string[];
};

type Grant = { handle: string | null; name: string | null; email: string | null; badge: string; granted_at: string };

const n = (v: number) => v.toLocaleString("en-US");
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function ReadersTab() {
  // What the link that opened this asked for: the waiting readers (an old
  // link to Verification) or the readers holding a badge (one to Badges).
  const [intent] = useState(() => readViewIntent("users"));
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [joined, setJoined] = useState<Joined>("any");
  const [provider, setProvider] = useState<Provider | "all">("all");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [marks, setMarks] = useState<MarksFilter>(intent === "badges" ? "badge" : "any");
  const [waiting, setWaiting] = useState(intent === "waiting");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [got, setGot] = useState<{ key: string; data: Payload | null } | null>(null);
  const [exporting, setExporting] = useState(false);
  const fresh = useRef(false);

  // A thumb types slower than a keyboard; wait for it to stop.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ joined, provider, plan, marks, offset: String(offset) });
  if (query.trim()) params.set("q", query.trim());
  if (waiting) params.set("waiting", "1");
  const qs = params.toString();
  const key = `${qs}#${version}`;

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;
    const url = `/api/admin/readers?${qs}${fresh.current ? "&fresh=1" : ""}`;
    fresh.current = false;
    void adminJson<Payload>(url, { signal: ac.signal }).then((d) => {
      if (alive) setGot({ key: `${qs}#${version}`, data: d });
    });
    return () => {
      alive = false;
      ac.abort();
    };
  }, [qs, version]);

  const grants = useAdminFetch<{ grants: Grant[]; unavailable?: boolean }>("/api/admin/badges");
  const data = got?.key === key ? got.data : (got?.data ?? null);
  const loading = got?.key !== key;
  const failed = !loading && got?.data === null;

  const reset = () => setOffset(0);

  async function exportCsv() {
    setExporting(true);
    const all = new URLSearchParams(qs);
    all.delete("offset");
    all.set("export", "1");
    const d = await adminJson<Payload>(`/api/admin/readers?${all.toString()}`);
    setExporting(false);
    if (!d) return;
    downloadCsv(
      "readers.csv",
      toCsv(
        ["Name", "Handle", "Email", "Joined", "Signs in with", "Plan", "Marks"],
        d.rows.map((r) => [
          r.name ?? "",
          r.handle ? `@${r.handle}` : "",
          r.email ?? "",
          r.joinedAt.slice(0, 10),
          r.provider ? PROVIDER_LABEL[r.provider] : "",
          planWord(r),
          marksOf(r)
            .map((m) => m.text)
            .join("; "),
        ]),
      ),
    );
  }

  const changed = () => {
    fresh.current = true;
    setVersion((v) => v + 1);
    grants.reload();
  };

  const lastPage = data ? Math.max(0, Math.floor((data.matched - 1) / data.pageSize) * data.pageSize) : 0;

  const list = (
    <Panel pad="px-0 pt-1 pb-0">
      <div
        className="hidden grid-cols-[minmax(0,1fr)_70px_76px_54px_150px] items-center gap-2.5 border-b px-4 font-sans text-[11.5px] md:grid"
        style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)", height: 32 }}
      >
        <span>Reader</span>
        <span>Joined</span>
        <span>Signs in</span>
        <span>Plan</span>
        <span>Marks</span>
      </div>
      {failed && !data ? (
        <Quiet className="px-4 py-6">The directory could not be read just now.</Quiet>
      ) : !data ? (
        <Quiet className="px-4 py-6">Reading the directory.</Quiet>
      ) : data.rows.length === 0 ? (
        <Quiet className="px-4 py-6">{waiting ? "Nobody is waiting on you." : "No reader matches."}</Quiet>
      ) : (
        <ul className={loading ? "opacity-60" : undefined}>
          {data.rows.map((r) => {
            const on = r.id === selected;
            const m = marksOf(r);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.id)}
                  aria-current={on ? "true" : undefined}
                  className="adm-control grid min-h-[50px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b px-4 py-1.5 text-left font-sans text-[13px] md:grid-cols-[minmax(0,1fr)_70px_76px_54px_150px]"
                  style={
                    {
                      borderColor: "var(--adm-line)",
                      "--_bg": on ? "var(--adm-panel-2)" : "transparent",
                      "--_bg-hover": "var(--adm-panel-2)",
                      boxShadow: on ? "inset 3px 0 0 var(--adm-ink)" : undefined,
                    } as React.CSSProperties
                  }
                >
                  <span className="min-w-0">
                    <span className={"block truncate " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
                      {r.name ?? (r.handle ? `@${r.handle}` : (r.email ?? "A reader"))}
                    </span>
                    <span className={"block truncate text-[11.5px] " + SENSITIVE} style={{ color: "var(--adm-ink-3)" }}>
                      {r.email ?? (r.handle ? `@${r.handle}` : "no email")}
                    </span>
                  </span>
                  {/* On a phone: the plan and the first mark, at the right. */}
                  <span className="flex items-center gap-2 text-[12px] md:hidden" style={{ color: "var(--adm-ink-2)" }}>
                    {m[0]?.kind === "waiting" ? <StatusDot tone="wait" /> : null}
                    {planWord(r)}
                  </span>
                  <span className="hidden font-mono text-[12px] md:block" style={{ color: "var(--adm-ink-2)" }}>
                    {shortDate(r.joinedAt)}
                  </span>
                  <span className="hidden md:block" style={{ color: "var(--adm-ink-2)" }}>
                    {r.provider ? PROVIDER_LABEL[r.provider] : ""}
                  </span>
                  <span className="hidden md:block" style={{ color: r.plan ? "var(--adm-ink-2)" : "var(--adm-ink-3)" }}>
                    {planWord(r)}
                  </span>
                  <span className="hidden min-w-0 items-center gap-1.5 truncate text-[12px] md:flex" style={{ color: "var(--adm-ink-2)" }}>
                    {m.length === 0 ? null : (
                      <>
                        {m[0].kind === "waiting" ? <StatusDot tone="wait" /> : m[0].kind === "given" ? <StatusDot tone="good" /> : null}
                        <span className="truncate">{m.map((x) => x.text).join(", ")}</span>
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {data && data.matched > data.pageSize ? (
        <div className="flex items-center gap-2 px-4 py-2 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          <span>
            {n(data.offset + 1)} to {n(Math.min(data.offset + data.pageSize, data.matched))} of {n(data.matched)}
          </span>
          <span className="ml-auto flex gap-1.5">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - (data.pageSize || 50)))}
              className="min-h-11 rounded-[6px] border px-3 disabled:opacity-40 md:min-h-[30px]"
              style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-2)" }}
            >
              Before
            </button>
            <button
              type="button"
              disabled={offset >= lastPage}
              onClick={() => setOffset(Math.min(lastPage, offset + (data.pageSize || 50)))}
              className="min-h-11 rounded-[6px] border px-3 disabled:opacity-40 md:min-h-[30px]"
              style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-2)" }}
            >
              Next
            </button>
          </span>
        </div>
      ) : null}
    </Panel>
  );

  // Beside the list while no reader is open: who waits on him, oldest first,
  // and the badges given lately.
  const sum = data?.summary;
  const side = (
    <div className="space-y-3.5">
      {sum && data ? (
        <Panel title="The readers" pad="px-4 pt-3.5 pb-3">
          <p className="font-sans text-[13px] leading-relaxed" style={{ color: "var(--adm-ink-2)" }}>
            {`${n(data.total)} readers. ${n(sum.joinedToday)} joined today and ${n(sum.joined30)} in 30 days; ${n(sum.signedIn7)} signed in this week.`}
          </p>
          {/* How they sign in, as one bar of fills, no hue: solid, then
              lighter steps of the ink. */}
          <div className="mt-2.5 flex h-[10px] overflow-hidden rounded-[3px]" aria-hidden>
            {(["google", "apple", "email", "other"] as const).map((k, i) =>
              sum.providers[k] > 0 ? (
                <i
                  key={k}
                  style={{
                    flex: sum.providers[k],
                    background: i === 0 ? "var(--adm-ink)" : i === 1 ? "var(--adm-ink-2)" : i === 2 ? "var(--adm-ink-3)" : "var(--adm-line-strong)",
                    marginLeft: 2,
                  }}
                />
              ) : null,
            )}
          </div>
          <p className="mt-1.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {(["google", "apple", "email", "other"] as const)
              .filter((k) => sum.providers[k] > 0)
              .map((k) => `${PROVIDER_LABEL[k]} ${Math.round((sum.providers[k] / Math.max(1, data.total)) * 100)}%`)
              .join(", ")}
          </p>
        </Panel>
      ) : null}
      <Panel title="Waiting on you" pad="px-4 pt-3.5 pb-2">
        {!data ? (
          <Quiet className="pb-2">Reading.</Quiet>
        ) : data.waiting === 0 ? (
          <Quiet className="pb-2">Nobody is waiting on you.</Quiet>
        ) : (
          <button
            type="button"
            onClick={() => {
              setWaiting(true);
              reset();
            }}
            className="flex min-h-11 w-full items-center gap-2 text-left font-sans text-[13px]"
            style={{ color: "var(--adm-ink)" }}
          >
            <StatusDot tone="wait" />
            {data.waiting === 1 ? "1 reader asked for a mark" : `${n(data.waiting)} readers asked for a mark`}
            <span className="ml-auto text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
              Show them
            </span>
          </button>
        )}
      </Panel>
      <Panel title="Given lately" pad="px-4 pt-3.5 pb-2">
        {grants.error ? (
          <Quiet className="pb-2">The badges could not be read just now.</Quiet>
        ) : !grants.data ? (
          <Quiet className="pb-2">Reading.</Quiet>
        ) : grants.data.grants.length === 0 ? (
          <Quiet className="pb-2">{grants.data.unavailable ? "Badges are not open on this database yet." : "No badge given yet."}</Quiet>
        ) : (
          <ul>
            {grants.data.grants.slice(0, 6).map((g, i) => (
              <li key={`${g.badge}-${g.granted_at}-${i}`} className="flex min-h-[40px] items-center gap-2 border-t font-sans first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px]" style={{ color: "var(--adm-ink)" }}>
                    {badgeLabel(g.badge)}
                  </span>
                  <span className={"block truncate text-[11.5px] " + SENSITIVE} style={{ color: "var(--adm-ink-3)" }}>
                    {g.handle ? `@${g.handle}` : (g.name ?? g.email ?? "a reader")}
                  </span>
                </span>
                <span className="font-mono text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  {shortDate(g.granted_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* On a phone an open card is a screen of its own. */}
      <div className={selected ? "hidden space-y-3 lg:block" : "space-y-3"}>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex min-h-[42px] min-w-0 flex-1 items-center gap-2.5 rounded-[7px] border px-3" style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-panel-2)" }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden style={{ color: "var(--adm-ink-3)" }}>
              <circle cx="9" cy="9" r="5.6" />
              <path d="M13.2 13.2 17 17" />
            </svg>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                reset();
              }}
              placeholder="Find a reader by email, @handle or name"
              aria-label="Find a reader by email, handle or name"
              className="min-w-0 flex-1 bg-transparent font-sans text-[14px] outline-none"
              style={{ color: "var(--adm-ink)" }}
            />
            <span className="hidden shrink-0 font-mono text-[11.5px] sm:inline" style={{ color: "var(--adm-ink-3)" }}>
              {data ? `${n(data.total)} readers` : ""}
            </span>
          </label>
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="adm-control inline-flex min-h-[42px] items-center gap-1.5 rounded-[6px] border px-3 font-sans text-[12.5px]"
            style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-2)", "--_bg": "transparent", "--_bg-hover": "var(--adm-panel-2)" } as React.CSSProperties}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 3v9.5M6 9l4 4 4-4M4 16.5h12" />
            </svg>
            {exporting ? "Exporting" : "Export CSV"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-[150px]">
            <Select<Joined>
              size="sm"
              ariaLabel="Joined"
              value={joined}
              onChange={(v) => {
                setJoined(v);
                reset();
              }}
              options={JOINED_OPTIONS.map(([value, label]) => ({ value, label: `Joined: ${label}` }))}
            />
          </div>
          <div className="w-[170px]">
            <Select<Provider | "all">
              size="sm"
              ariaLabel="Signs in with"
              value={provider}
              onChange={(v) => {
                setProvider(v);
                reset();
              }}
              options={PROVIDER_OPTIONS.map(([value, label]) => ({ value, label: `Signs in with: ${label}` }))}
            />
          </div>
          <Segmented<PlanFilter>
            label="Plan"
            options={PLAN_OPTIONS}
            value={plan}
            onChange={(v) => {
              setPlan(v);
              reset();
            }}
          />
          <div className="w-[190px]">
            <Select<MarksFilter>
              size="sm"
              ariaLabel="Marks"
              value={marks}
              onChange={(v) => {
                setMarks(v);
                reset();
              }}
              options={MARK_OPTIONS.map(([value, label]) => ({ value, label: `Marks: ${label}` }))}
            />
          </div>
          <label className="ml-auto flex min-h-11 cursor-pointer items-center gap-2.5 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
            <StatusDot tone="wait" />
            Waiting on you{data ? `, ${n(data.waiting)}` : ""}
            <input
              type="checkbox"
              role="switch"
              checked={waiting}
              onChange={(e) => {
                setWaiting(e.target.checked);
                reset();
              }}
              className="h-[18px] w-[18px]"
            />
          </label>
        </div>

        {data && data.missing.length > 0 ? <Quiet>{`Not on this database yet: ${data.missing.join(", ")}.`}</Quiet> : null}
      </div>

      <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_352px]">
        <div className={selected ? "hidden lg:block" : undefined}>{list}</div>
        <div className={selected ? undefined : "hidden lg:block"}>
          {selected ? <ReaderCard key={selected} id={selected} onChanged={changed} onBack={() => setSelected(null)} /> : side}
        </div>
      </div>
    </div>
  );
}
