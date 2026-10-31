"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  DataTable,
  Email,
  Modal,
  Pill,
  Sensitive,
  StatCard,
  Toolbar,
  ToolbarButton,
} from "@/components/admin/primitives";
import { ReadinessList } from "@/components/admin/eikonBox/ReadinessCard";
import { Btn, Label, Ladder, Mark, State, StepLine, Thumb, litClass, type MarkKind } from "@/components/admin/needed/parts";
import { downloadCsv } from "@/lib/admin/csv";
import { trackingLink } from "@/lib/shop/trackingLink";
import { deadlineFromInput, deadlineInputValue } from "@/lib/eikonBox/deadline";
import {
  claimCounts,
  claimLabelCsv,
  monthAfter,
  monthName,
  monthStep,
  monthSteps,
  oneMove,
  packedLines,
  pickMonths,
  supplierLink,
  takeUpLine,
  type ClaimCounts,
} from "@/lib/eikonBox/month";
import { DROP_TRANSITIONS } from "@/lib/eikonBox/status";
import type { ClaimStatus, DropStatus } from "@/lib/eikonBox/types";

/**
 * The EIKON Box: the owner's pick, A and C mixed (r3-16, 2026-10-30, "a mix
 * of A and C on the icon box").
 *
 * A's month on top: the drop's five steps on one line (Draft, Open, Closed,
 * Gathering, Shipped) with the one it is on lit, the one move now with its
 * counts, and next month's draft and the readiness checks beside it. C's
 * shelf of drops below, one photo card per month, the one in hand lit, with
 * the next month to make at the end. A card opens its month on top.
 *
 * The three sub-tabs it was (Drops, Claims, Announce) are inside the month
 * now: Edit holds the drop's editor, Who claimed the roster with its CSV,
 * and Announce asks twice, as it did. Every move is still the drops route's
 * to allow (DROP_TRANSITIONS, a 409 for anything else).
 *
 * The claim deadline is shown and saved in UTC (lib/eikonBox/deadline.ts):
 * it used to show UTC and save the browser's local time, so every save moved
 * it by the browser's offset.
 *
 * NOT gated on the feature flag: a drop can be built and inspected while the
 * member side is still dark.
 */

type AdminDrop = {
  id: string;
  title: string;
  period_month: string;
  teaser: string | null;
  image_url: string | null;
  status: DropStatus;
  claims_open_at: string | null;
  claims_close_at: string | null;
  sourcing_notes: string | null;
  created_by_email: string | null;
  created_at: string | null;
  updated_at: string | null;
  claimsCount: number;
  notShippedCount: number;
};

type AdminClaim = {
  id: string;
  userId: string;
  email: string | null;
  status: ClaimStatus;
  tracking: string | null;
  addressLine: string;
  address: {
    name: string;
    address: {
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  } | null;
  proUntilAtClaim: string | null;
  lapsed: boolean;
  cancelReason: string | null;
  adminNote: string | null;
  claimedAt: string;
};

type Dialog = "edit" | "announce" | "roster" | "trackings" | null;

const INPUT =
  "w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[13px] outline-none";
const FIELD = { borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

function fmtDate(iso: string | null): string {
  if (!iso) return "not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** The 10th of that month at 23:59 UTC, as the default claim deadline. */
function defaultClose(period: string): string {
  const base = new Date(`${period}T00:00:00Z`);
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 10, 23, 59, 0)).toISOString();
}

/** A drop's state, as a mark and a word: the step it is on. */
function dropState(d: AdminDrop): { kind: MarkKind; word: string } {
  if (d.status === "cancelled") return { kind: "idle", word: "Cancelled" };
  if (d.status === "shipped") return { kind: "done", word: "Shipped" };
  if (d.status === "draft") return { kind: "wait", word: "Draft" };
  return { kind: "lit", word: monthStep(d.status) ?? d.status };
}

/** The line under a drop on the shelf. */
function shelfLine(d: AdminDrop): string {
  switch (d.status) {
    case "draft":
      return d.claims_close_at ? `Open it, then announce. Claims close ${fmtDate(d.claims_close_at)}` : "Set a deadline, then open it";
    case "open":
      return `${d.claimsCount} claimed so far`;
    case "closed":
      return `${d.claimsCount} claimed · claims closed`;
    case "fulfilling":
      return `${d.claimsCount} claimed · ${d.notShippedCount} still to post`;
    case "shipped":
      return `${d.claimsCount} claimed · ${d.notShippedCount === 0 ? "all posted" : `${d.notShippedCount} not posted`}`;
    default:
      return "Cancelled";
  }
}

export function EikonBoxTab() {
  const [drops, setDrops] = useState<AdminDrop[]>([]);
  const [activeProCount, setActiveProCount] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [claims, setClaims] = useState<{ dropId: string; rows: AdminClaim[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [creating, setCreating] = useState<string | null>(null);

  // No synchronous setState before the first await: these run from effects,
  // where setting state in the body cascades renders.
  const loadDrops = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/eikon-box/drops", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { drops?: AdminDrop[]; activeProCount?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "The drops could not be read.");
      setDrops(data.drops ?? []);
      setActiveProCount(data.activeProCount ?? 0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The drops could not be read.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClaims = useCallback(async (dropId: string) => {
    try {
      const res = await fetch(`/api/admin/eikon-box/claims?dropId=${encodeURIComponent(dropId)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { claims?: AdminClaim[] };
      if (res.ok) setClaims({ dropId, rows: data.claims ?? [] });
    } catch {
      /* leave the previous roster on screen rather than blanking it */
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the mount
       read shares its path with every save's reload; writes are past an await. */
    void loadDrops();
  }, [loadDrops]);

  const picked = pickMonths(drops);
  const month = drops.find((d) => d.id === pickedId) ?? picked.current;
  const next = month && month.id === picked.current?.id ? picked.next : null;
  const monthId = month?.id ?? null;

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the roster
       of the month on top; writes are past an await. */
    if (monthId) void loadClaims(monthId);
  }, [monthId, loadClaims]);

  const rows = claims && claims.dropId === monthId ? claims.rows : [];
  const counts = claimCounts(rows);

  async function patchDrop(dropId: string, body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eikon-box/drops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropId, ...body }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That did not save.");
      await loadDrops();
      if (monthId) await loadClaims(monthId);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function patchClaims(claimIds: string[], body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eikon-box/claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimIds, ...body }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That did not save.");
      if (monthId) await loadClaims(monthId);
      await loadDrops();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const latest = [...drops].sort((a, b) => b.period_month.localeCompare(a.period_month))[0] ?? null;
  const toMake = monthAfter(latest?.period_month ?? null, new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {error ? (
          <p role="alert" className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
            {error}
          </p>
        ) : notice ? (
          <p role="status" className="font-sans text-[12.5px]" style={{ color: "var(--adm-good)" }}>
            {notice}
          </p>
        ) : (
          <span />
        )}
        <Btn icon="plus" onClick={() => setCreating(toMake)}>
          New drop
        </Btn>
      </div>

      {loading && drops.length === 0 ? (
        <p className="font-sans text-[13px]" style={ink3}>
          Reading the drops…
        </p>
      ) : !month ? (
        <Card title="No drop yet">
          <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
            Make the first month&apos;s drop. It starts as a draft: opening it is a separate step.
          </p>
          <div className="mt-3">
            <Btn primary icon="plus" onClick={() => setCreating(toMake)}>
              Make {monthName(toMake)}&apos;s drop
            </Btn>
          </div>
        </Card>
      ) : (
        <div className="lg:flex lg:items-start lg:gap-4">
          <MonthCard
            drop={month}
            counts={counts}
            activePro={activeProCount}
            busy={busy}
            onMove={(to) =>
              void patchDrop(month.id, {
                status: to,
                ...(to === "open" && month.claims_close_at ? { claimsCloseAt: month.claims_close_at } : {}),
              })
            }
            onDialog={setDialog}
            onLabelFile={() => downloadCsv(`eikon-labels-${month.period_month}.csv`, claimLabelCsv(rows))}
          />
          <aside className="mt-4 space-y-3 lg:mt-0 lg:w-[300px] lg:flex-none">
            {next ? (
              <NextCard
                drop={next}
                busy={busy}
                onOpenClaims={() => void patchDrop(next.id, { status: "open", ...(next.claims_close_at ? { claimsCloseAt: next.claims_close_at } : {}) })}
                onAnnounce={() => {
                  setPickedId(next.id);
                  setDialog("announce");
                }}
                onPick={() => setPickedId(next.id)}
              />
            ) : (
              <Card>
                <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
                  No draft for {monthName(toMake)} yet.
                </p>
                <div className="mt-2.5">
                  <Btn small icon="plus" onClick={() => setCreating(toMake)}>
                    Make {monthName(toMake)}&apos;s drop
                  </Btn>
                </div>
              </Card>
            )}
            <Card>
              <Label>Can it run</Label>
              <div className="mt-2">
                <ReadinessList />
              </div>
            </Card>
          </aside>
        </div>
      )}

      {drops.length > 0 ? (
        <section aria-label="Every month's drop">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...drops]
              .sort((a, b) => a.period_month.localeCompare(b.period_month))
              .slice(-7)
              .map((d) => {
                const on = d.id === month?.id;
                const st = dropState(d);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setPickedId(d.id)}
                      aria-current={on ? "true" : undefined}
                      className={`block w-full overflow-hidden rounded-[var(--adm-radius)] border text-left ${on ? litClass : ""}`}
                      style={{
                        borderColor: on ? "var(--adm-ink)" : "var(--adm-line)",
                        background: "var(--adm-panel)",
                        opacity: d.status === "shipped" && !on ? 0.72 : d.status === "cancelled" ? 0.55 : 1,
                      }}
                    >
                      <Thumb src={d.image_url} height={140} rounded={false} />
                      <span className="block px-3 py-2.5">
                        <span className="block font-sans text-[11px]" style={ink3}>
                          {monthName(d.period_month)}
                        </span>
                        <span className="mt-0.5 block truncate font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
                          {d.title}
                        </span>
                        <span className="mt-1.5 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink)" }}>
                          <State kind={st.kind}>{st.word}</State>
                        </span>
                        <span className="mt-1 block truncate font-sans text-[11px]" style={ink3}>
                          {shelfLine(d)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            <li>
              <button
                type="button"
                onClick={() => setCreating(toMake)}
                className="grid h-full min-h-[236px] w-full place-items-center rounded-[var(--adm-radius)] border text-center"
                style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}
              >
                <span>
                  <span className="mx-auto block w-fit text-[22px] leading-none">+</span>
                  <span className="mt-1.5 block font-sans text-[12px]">{monthName(toMake)}</span>
                  <span className="block font-sans text-[11px]">make the drop</span>
                </span>
              </button>
            </li>
          </ul>
        </section>
      ) : null}

      {dialog === "edit" && month ? (
        <Modal title={`Edit ${month.title}`} subtitle={`${monthName(month.period_month, true)} · ${dropState(month).word}`} onClose={() => setDialog(null)}>
          <DropEditor
            key={`${month.id}:${month.updated_at ?? ""}`}
            drop={month}
            busy={busy}
            onPatch={async (body) => {
              if (await patchDrop(month.id, body)) {
                setDialog(null);
                setNotice("Saved.");
              }
            }}
          />
        </Modal>
      ) : null}
      {dialog === "announce" && month ? (
        <Modal title="Announce" subtitle="It asks twice: an announcement cannot be taken back." onClose={() => setDialog(null)}>
          <AnnouncePanel drop={month} />
        </Modal>
      ) : null}
      {dialog === "roster" && month ? (
        <Modal title={`Who claimed ${month.title}`} subtitle={`${monthName(month.period_month, true)} · ${counts.total} claimed`} onClose={() => setDialog(null)} wide>
          <Roster
            claims={rows}
            counts={counts}
            activePro={activeProCount}
            busy={busy}
            period={month.period_month}
            onPatch={patchClaims}
          />
        </Modal>
      ) : null}
      {dialog === "trackings" && month ? (
        <Modal title="Paste the trackings" subtitle="One per packed box. Saving one marks that box shipped." onClose={() => setDialog(null)}>
          <Trackings claims={rows} busy={busy} onSave={(id, tracking) => patchClaims([id], { outboundTracking: tracking })} />
        </Modal>
      ) : null}
      {creating ? (
        <CreateDropModal
          period={creating}
          onClose={() => setCreating(null)}
          onCreated={async () => {
            setCreating(null);
            setNotice("Made as a draft. Open it when it is ready.");
            await loadDrops();
          }}
        />
      ) : null}
    </div>
  );
}

/* ── The month on top ──────────────────────────────────────────────── */

function MonthCard({
  drop,
  counts,
  activePro,
  busy,
  onMove,
  onDialog,
  onLabelFile,
}: {
  drop: AdminDrop;
  counts: ClaimCounts;
  activePro: number;
  busy: boolean;
  onMove: (to: DropStatus) => void;
  onDialog: (d: Dialog) => void;
  onLabelFile: () => void;
}) {
  const steps = monthSteps(drop);
  const move = oneMove(drop, counts, new Date());
  const st = dropState(drop);
  const tiles: [string, number, MarkKind][] = [
    ["Claimed", counts.total, "wait"],
    ["Packed", counts.packed, "done"],
    ["Posted", counts.posted, "idle"],
    ["Lapsed", counts.lapsed, "late"],
    ["Did not claim", Math.max(0, activePro - counts.total), "idle"],
  ];

  const primary = move.primary;
  const primaryButton = !primary ? null : primary.kind === "status" ? (
    <Btn primary lit busy={busy} onClick={() => onMove(primary.to)}>
      {primary.label}
    </Btn>
  ) : primary.kind === "temu" ? (
    primary.url ? (
      <Btn primary lit icon="ext" href={primary.url}>
        {primary.label}
      </Btn>
    ) : (
      <Btn primary lit icon="edit" onClick={() => onDialog("edit")} title="The Order on Temu button opens the first link in the drop's sourcing notes">
        Put the Temu link in its notes
      </Btn>
    )
  ) : (
    <Btn primary lit icon="edit" onClick={() => onDialog("edit")}>
      {primary.label}
    </Btn>
  );

  return (
    <section className="min-w-0 flex-1 rounded-[var(--adm-radius)] border p-4 md:p-5" style={{ borderColor: "var(--adm-line)" }} aria-label="The month in hand">
      <div className="flex items-center gap-3.5">
        <Thumb src={drop.image_url} size={58} />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[11.5px]" style={ink3}>
            {monthName(drop.period_month)} drop
          </p>
          <p className="mt-0.5 truncate font-sans text-[17px] font-semibold md:text-[18px]" style={{ color: "var(--adm-ink)" }}>
            {drop.title}
          </p>
        </div>
        <span className="hidden font-sans text-[13px] sm:inline">
          <State kind={st.kind}>{st.word}</State>
        </span>
      </div>

      <div className="mt-5 hidden md:block">
        <StepLine label="The drop's five steps" steps={steps.map((s) => ({ label: s.step, state: s.state, note: s.note }))} />
      </div>
      <div className="mt-4 md:hidden">
        <Ladder
          label="The drop's five steps"
          steps={steps.map((s) => ({
            label: s.step,
            state: s.state,
            note: s.note,
            sub: s.state === "now" ? move.line : null,
          }))}
        />
      </div>

      <div className="mt-5 rounded-[var(--adm-radius)] p-3.5" style={{ background: "var(--adm-panel-2)" }}>
        <p className="hidden font-sans text-[14px] font-semibold md:block" style={{ color: "var(--adm-ink)" }}>
          {move.line}
        </p>
        <div className="mt-0 flex flex-wrap gap-2 md:mt-3">
          {primaryButton}
          {move.also.includes("label-file") ? (
            <Btn icon="download" onClick={onLabelFile}>
              Label file for {counts.packed}
            </Btn>
          ) : null}
          {move.also.includes("trackings") ? (
            <Btn icon="edit" onClick={() => onDialog("trackings")}>
              Paste trackings
            </Btn>
          ) : null}
          {move.also.includes("mark-packed") ? (
            <Btn onClick={() => onDialog("roster")}>Mark packed</Btn>
          ) : null}
          {move.also.includes("start-gathering") ? (
            <Btn busy={busy} onClick={() => onMove("fulfilling")}>
              Start gathering
            </Btn>
          ) : null}
          {move.also.includes("announce") ? (
            <Btn icon="mail" onClick={() => onDialog("announce")}>
              Announce
            </Btn>
          ) : null}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([label, n, kind]) => (
          <li key={label} className="rounded-[var(--adm-radius)] border px-3 py-2.5" style={{ borderColor: "var(--adm-line)" }}>
            <span className="flex items-center gap-1.5 font-sans text-[11px]" style={ink3}>
              <Mark kind={kind} />
              {label}
            </span>
            <span className="mt-1 block font-mono text-[22px]" style={{ color: "var(--adm-ink)" }}>
              {n}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 font-sans text-[11.5px]" style={ink3}>
        {takeUpLine(activePro, counts.total, counts.lapsed)}
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2.5 font-sans text-[12px]" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-2)" }}>
        <button type="button" onClick={() => onDialog("roster")} className="hit-44 min-h-9 underline underline-offset-[3px]">
          Who claimed
        </button>
        <button type="button" onClick={() => onDialog("edit")} className="hit-44 min-h-9 underline underline-offset-[3px]">
          Edit the drop
        </button>
        <span className="min-h-9 py-2" style={ink3}>
          Claims close {fmtDate(drop.claims_close_at)} (UTC)
        </span>
      </div>
    </section>
  );
}

/** Next month's draft, beside the month in hand. */
function NextCard({
  drop,
  busy,
  onOpenClaims,
  onAnnounce,
  onPick,
}: {
  drop: AdminDrop;
  busy: boolean;
  onOpenClaims: () => void;
  onAnnounce: () => void;
  onPick: () => void;
}) {
  // Openable when the drops route would allow it: a deadline in the future.
  const ready = oneMove(drop, claimCounts([]), new Date()).primary?.kind === "status";
  return (
    <div className="rounded-[var(--adm-radius)] border p-3.5" style={{ borderColor: "var(--adm-line)" }}>
      <button type="button" onClick={onPick} className="flex w-full items-center gap-3 text-left">
        <Thumb src={drop.image_url} size={46} />
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-[11px]" style={ink3}>
            {monthName(drop.period_month)} drop
          </span>
          <span className="mt-0.5 block truncate font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
            {drop.title}
          </span>
          <span className="mt-1 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-2)" }}>
            <State kind="wait">Draft · opens {monthName(drop.period_month)} 1</State>
          </span>
        </span>
      </button>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Btn small primary busy={busy} disabled={!ready} onClick={onOpenClaims} title={ready ? undefined : "Set a deadline in the future first"}>
          Open claims
        </Btn>
        <Btn small icon="mail" onClick={onAnnounce}>
          Announce
        </Btn>
      </div>
      <p className="mt-1.5 font-sans text-[11px]" style={ink3}>
        Announce asks twice: it cannot be taken back.
      </p>
    </div>
  );
}

/* ── The drop's editor, the roster and the trackings ───────────────── */

function DropEditor({
  drop,
  busy,
  onPatch,
}: {
  drop: AdminDrop;
  busy: boolean;
  onPatch: (body: Record<string, unknown>) => Promise<void>;
}) {
  // Drafts initialise from the drop and are NOT synced back by an effect.
  // The caller remounts this component with a key when the drop changes.
  const [teaser, setTeaser] = useState(drop.teaser ?? "");
  const [notes, setNotes] = useState(drop.sourcing_notes ?? "");
  const [imageUrl, setImageUrl] = useState(drop.image_url ?? "");
  // UTC both ways (lib/eikonBox/deadline.ts): the field shows the stored
  // instant's UTC wall time and saves what it shows as UTC.
  const [close, setClose] = useState(deadlineInputValue(drop.claims_close_at));

  const legal = DROP_TRANSITIONS[drop.status] ?? [];
  const closeIso = deadlineFromInput(close);
  const link = supplierLink(notes);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="eb-teaser" className="mb-1 block font-sans text-[11.5px] font-medium" style={ink3}>
          Teaser (members see this)
        </label>
        <textarea id="eb-teaser" className={`${INPUT} min-h-[72px]`} style={FIELD} value={teaser} onChange={(e) => setTeaser(e.target.value)} placeholder="Contents vary month to month; no specific item is promised." />
      </div>

      <div>
        <label htmlFor="eb-image" className="mb-1 block font-sans text-[11.5px] font-medium" style={ink3}>
          Photo address
        </label>
        <input id="eb-image" className={INPUT} style={FIELD} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Upload it with the Catalogue's photo manager, paste the address here" />
      </div>

      <div>
        <label htmlFor="eb-close" className="mb-1 block font-sans text-[11.5px] font-medium" style={ink3}>
          Claims close, in UTC
        </label>
        <input id="eb-close" type="datetime-local" className={INPUT} style={FIELD} value={close} onChange={(e) => setClose(e.target.value)} />
        <p className="mt-1 font-sans text-[11.5px]" style={ink3}>
          {closeIso ? `That is ${new Date(closeIso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} where you are. ` : ""}A drop cannot be
          opened without a deadline in the future: that is what makes &ldquo;an unclaimed box is not carried over&rdquo; hold.
        </p>
      </div>

      <div>
        <label htmlFor="eb-notes" className="mb-1 block font-sans text-[11.5px] font-medium" style={ink3}>
          Sourcing notes (never leave this screen)
        </label>
        <textarea id="eb-notes" className={`${INPUT} min-h-[60px]`} style={FIELD} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="The Temu link, the unit cost, the inbound tracking" />
        <p className="mt-1 font-sans text-[11.5px]" style={ink3}>
          {link ? "Order on Temu opens the first link here." : "Put the Temu link here and Order on Temu opens it."}
        </p>
      </div>

      <Toolbar>
        <ToolbarButton
          variant="primary"
          loading={busy || (close !== "" && !closeIso)}
          onClick={() =>
            onPatch({
              teaser: teaser || null,
              imageUrl: imageUrl || null,
              sourcingNotes: notes || null,
              claimsCloseAt: closeIso,
            })
          }
        >
          Save
        </ToolbarButton>
        {legal.map((to) => (
          <ToolbarButton
            key={to}
            loading={busy}
            variant={to === "cancelled" ? "danger" : "default"}
            onClick={() =>
              onPatch({
                status: to,
                ...(to === "open" && closeIso ? { claimsCloseAt: closeIso } : {}),
              })
            }
          >
            {to === "cancelled" ? "Cancel the drop" : `Move to ${monthStep(to) ?? to}`}
          </ToolbarButton>
        ))}
      </Toolbar>
    </div>
  );
}

function Roster({
  claims,
  counts,
  activePro,
  busy,
  period,
  onPatch,
}: {
  claims: AdminClaim[];
  counts: ClaimCounts;
  activePro: number;
  busy: boolean;
  period: string;
  onPatch: (ids: string[], body: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Waiting for their piece" value={counts.waiting} accent hint="Order this many" />
        <StatCard label="Packed" value={counts.packed} />
        <StatCard label="Posted" value={counts.posted} />
        <StatCard label="Lapsed" value={counts.lapsed} hint="Pro ended since claiming" />
        <StatCard label="Did not claim" value={Math.max(0, activePro - counts.total)} hint={`${activePro} active Pro`} />
      </div>

      <Toolbar>
        <ToolbarButton
          onClick={() =>
            void onPatch(
              claims.filter((c) => c.status === "claimed").map((c) => c.id),
              { status: "packed" },
            )
          }
          loading={busy || counts.waiting === 0}
          title="Freezes each address and moves the claim to packed"
        >
          Mark all claimed as packed
        </ToolbarButton>
      </Toolbar>

      <DataTable<AdminClaim>
        columns={[
          { key: "claimed", label: "Claimed", render: (c) => fmtDate(c.claimedAt), csv: (c) => c.claimedAt },
          { key: "name", label: "Name", render: (c) => <Sensitive value={c.address?.name} />, csv: (c) => c.address?.name ?? "" },
          { key: "email", label: "Email", render: (c) => <Email value={c.email} />, csv: (c) => c.email ?? "" },
          { key: "line1", label: "Address", render: (c) => <Sensitive value={c.addressLine} />, csv: (c) => c.address?.address.line1 ?? "" },
          { key: "line2", label: "", render: () => null, csv: (c) => c.address?.address.line2 ?? "" },
          { key: "city", label: "", render: () => null, csv: (c) => c.address?.address.city ?? "" },
          { key: "state", label: "", render: () => null, csv: (c) => c.address?.address.state ?? "" },
          { key: "zip", label: "", render: () => null, csv: (c) => c.address?.address.postal_code ?? "" },
          {
            key: "status",
            label: "Status",
            render: (c) => (
              <span className="inline-flex items-center gap-1.5">
                <Pill tone={c.status === "cancelled" ? "rose" : "neutral"}>{c.status}</Pill>
                {c.lapsed && c.status !== "cancelled" && <Pill tone="rose">lapsed</Pill>}
              </span>
            ),
            csv: (c) => c.status,
          },
          { key: "tracking", label: "Tracking", render: (c) => c.tracking ?? "none", csv: (c) => c.tracking ?? "" },
        ]}
        rows={claims}
        rowKey={(c) => c.id}
        empty="No claims yet."
        csvFilename={`eikon-roster-${period}.csv`}
      />

      <div className="space-y-3">
        {claims
          .filter((c) => c.status !== "cancelled")
          .map((c) => (
            <ClaimRow key={`${c.id}:${c.tracking ?? ""}`} claim={c} busy={busy} onPatch={onPatch} />
          ))}
      </div>
    </div>
  );
}

function ClaimRow({
  claim,
  busy,
  onPatch,
}: {
  claim: AdminClaim;
  busy: boolean;
  onPatch: (ids: string[], body: Record<string, unknown>) => Promise<boolean>;
}) {
  // Remounted by key when the tracking number changes, so no syncing effect.
  const [draft, setDraft] = useState(claim.tracking ?? "");
  const link = claim.tracking ? trackingLink(claim.tracking) : null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
            <Sensitive value={claim.address?.name} /> {claim.lapsed && <Pill tone="rose">Pro lapsed since claiming</Pill>}
          </p>
          <p className="mt-0.5 font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
            <Sensitive value={claim.addressLine} fallback="No address on file" />
          </p>
          <p className="mt-0.5 font-sans text-[11.5px]" style={ink3}>
            <Email value={claim.email} fallback="no email" /> · claimed {fmtDate(claim.claimedAt)} · Pro until {fmtDate(claim.proUntilAtClaim)}
          </p>
        </div>
        <Pill>{claim.status}</Pill>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input className={`${INPUT} max-w-[280px]`} style={FIELD} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Tracking number" aria-label="Tracking number" />
        <ToolbarButton loading={busy} onClick={() => void onPatch([claim.id], { outboundTracking: draft || null })}>
          Save tracking
        </ToolbarButton>
        {link && (
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-sans text-[12.5px] underline underline-offset-[3px]" style={{ color: "var(--adm-ink-2)" }}>
            {link.carrier ?? "Track"}
          </a>
        )}
        {claim.status !== "cancelled" && (
          <ToolbarButton
            variant="danger"
            loading={busy}
            onClick={() => void onPatch([claim.id], { status: "cancelled", cancelReason: "Cancelled by operator" })}
          >
            Cancel
          </ToolbarButton>
        )}
      </div>

      {claim.status === "shipped" && !claim.tracking && (
        <p className="mt-2 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
          Marked shipped with no tracking number.
        </p>
      )}
    </Card>
  );
}

/** One tracking field per packed box: saving one marks that box shipped. */
function Trackings({
  claims,
  busy,
  onSave,
}: {
  claims: AdminClaim[];
  busy: boolean;
  onSave: (id: string, tracking: string) => Promise<boolean>;
}) {
  const lines = packedLines(claims);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (lines.length === 0) {
    return (
      <p className="font-sans text-[13px]" style={ink3}>
        No packed box is waiting for a tracking number.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {lines.map((l) => (
        <li key={l.id} className="flex flex-wrap items-center gap-2">
          <span className="min-w-[140px] flex-1 font-sans text-[12.5px]">
            <Sensitive value={l.who} className="block" />
            <span className="block text-[11.5px]" style={ink3}>
              <Sensitive value={l.where} />
            </span>
          </span>
          <input
            className={`${INPUT} max-w-[240px]`}
            style={FIELD}
            value={drafts[l.id] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [l.id]: e.target.value }))}
            placeholder="Tracking number"
            aria-label={`Tracking number for ${l.who}`}
          />
          <Btn small busy={busy} disabled={!(drafts[l.id] ?? "").trim()} onClick={() => void onSave(l.id, (drafts[l.id] ?? "").trim())}>
            Save
          </Btn>
        </li>
      ))}
    </ul>
  );
}

function CreateDropModal({
  period: initialPeriod,
  onClose,
  onCreated,
}: {
  period: string;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState(initialPeriod);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eikon-box/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), periodMonth: period, claimsCloseAt: defaultClose(period) }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not make the drop.");
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the drop.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New drop" subtitle="Made as a draft. Opening it is a separate, deliberate step." onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label htmlFor="eb-title" className="mb-1 block font-sans text-[11.5px] font-medium" style={ink3}>
            Title
          </label>
          <input id="eb-title" className={INPUT} style={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prayer rope with cross and tassel" />
        </div>
        <div>
          <label htmlFor="eb-period" className="mb-1 block font-sans text-[11.5px] font-medium" style={ink3}>
            Month (the first of it)
          </label>
          <input id="eb-period" type="date" className={INPUT} style={FIELD} value={period} onChange={(e) => setPeriod(e.target.value)} />
          <p className="mt-1 font-sans text-[11.5px]" style={ink3}>
            Claims close on the 10th at 23:59 UTC; change it in the drop&apos;s editor.
          </p>
        </div>
        {error && (
          <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
            {error}
          </p>
        )}
        <Toolbar>
          <ToolbarButton variant="primary" loading={busy || !title.trim()} onClick={create}>
            Make the draft
          </ToolbarButton>
        </Toolbar>
      </div>
    </Modal>
  );
}

function AnnouncePanel({ drop }: { drop: AdminDrop }) {
  const [title, setTitle] = useState(`${drop.title} is open`);
  const [body, setBody] = useState(
    `Claim yours by ${fmtDate(drop.claims_close_at)}. We gather each box to the number claimed, so a box that is not claimed is not sent.`,
  );
  const [subject, setSubject] = useState(`Your ${drop.title} is ready to claim`);
  const [withEmail, setWithEmail] = useState(true);
  // Push and email are separate switches: with Apple and Firebase keys
  // missing, a push-only announcement reaches nobody, and email is how the
  // drop still gets told. See "Can it run".
  const [withPush, setWithPush] = useState(true);
  const [preview, setPreview] = useState<{
    total: number;
    configured: { web: boolean; ios: boolean; fcm: boolean };
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/push/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience: "pro" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPreview(d))
      .catch(() => {});
  }, []);

  const dryRun = preview && !preview.configured.web && !preview.configured.ios && !preview.configured.fcm;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eikon-box/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropId: drop.id,
          ...(withPush ? { push: { title, body } } : {}),
          ...(withEmail ? { email: { subject } } : {}),
          confirm: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Announce failed.");
      setResult(
        `Push: ${data.push?.status ?? "not sent"} to ${data.push?.recipients ?? 0}. ` +
          (data.email
            ? `Email: ${data.email.sent} sent, ${data.email.skipped} skipped, ${data.email.failed} failed.`
            : "Email: not sent."),
      );
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Announce failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {drop.status !== "open" && (
        <p className="rounded-[var(--adm-radius-sm)] border border-dashed px-3 py-2 font-sans text-[12.5px]" style={{ borderColor: "var(--adm-ink-2)", color: "var(--adm-warn)" }}>
          This drop is {monthStep(drop.status)?.toLowerCase() ?? drop.status}. Open it before announcing.
        </p>
      )}
      {dryRun && (
        <p className="rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12.5px]" style={{ borderColor: "var(--adm-ink)", color: "var(--adm-critical)" }}>
          No push credentials are configured. A send will be logged as &ldquo;enqueued&rdquo; and nothing will actually leave.
        </p>
      )}
      <div>
        <label htmlFor="eb-push-title" className="mb-1 block font-sans text-[11.5px] font-medium" style={ink3}>
          Push title ({title.length}/80)
        </label>
        <input id="eb-push-title" className={INPUT} style={FIELD} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="eb-push-body" className="mb-1 block font-sans text-[11.5px] font-medium" style={ink3}>
          Push body ({body.length}/300)
        </label>
        <textarea id="eb-push-body" className={`${INPUT} min-h-[72px]`} style={FIELD} value={body} maxLength={300} onChange={(e) => setBody(e.target.value)} />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={withPush} onChange={(e) => setWithPush(e.target.checked)} className="h-4 w-4" />
        <span className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
          Send a push notification
        </span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={withEmail} onChange={(e) => setWithEmail(e.target.checked)} className="h-4 w-4" />
        <span className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
          Send an email
        </span>
      </label>
      {withEmail && <input className={INPUT} style={FIELD} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" aria-label="Email subject" />}

      {error && (
        <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          {error}
        </p>
      )}
      {result && (
        <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-good)" }}>
          {result}
        </p>
      )}

      <Toolbar>
        {!confirming ? (
          <ToolbarButton variant="primary" onClick={() => setConfirming(true)} loading={!withPush && !withEmail} title="Two-step on purpose">
            Review send
          </ToolbarButton>
        ) : (
          <>
            <ToolbarButton variant="primary" loading={busy} onClick={send}>
              {withPush
                ? `Confirm: announce to ${preview?.total ?? 0} devices${withEmail ? " and by email" : ""}`
                : "Confirm: announce by email"}
            </ToolbarButton>
            <ToolbarButton onClick={() => setConfirming(false)}>Cancel</ToolbarButton>
          </>
        )}
      </Toolbar>
    </div>
  );
}
