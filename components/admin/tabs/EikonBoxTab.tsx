"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  DataTable,
  Modal,
  Pill,
  StatCard,
  SubTabs,
  Toolbar,
  ToolbarButton,
} from "@/components/admin/primitives";
import { trackingLink } from "@/lib/shop/trackingLink";
import { DROP_TRANSITIONS } from "@/lib/eikonBox/status";
import type { ClaimStatus, DropStatus } from "@/lib/eikonBox/types";

/**
 * The EIKON Box console: build a drop, watch claims land, source to the
 * number claimed, then ship.
 *
 * Modelled on OrdersTab, deliberately: the same DataTable + CSV, the same
 * per-row tracking draft, the same missing-tracking warning. The owner
 * should not have to learn a second fulfilment UI.
 *
 * NOT gated on the feature flag. The whole point is that August's drop can
 * be built and inspected while the member side is still dark.
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

type Panel = "drops" | "claims" | "announce";

const INPUT =
  "w-full rounded-[var(--adm-radius-sm)] border border-paper/15 bg-paper/[0.04] px-3 py-2 font-sans text-detail text-paper focus:outline-none focus:ring-2 focus:ring-gold/40";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function fmtMonth(period: string): string {
  if (!period) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}T12:00:00Z`));
}

function dropTone(s: DropStatus): "neutral" | "gold" | "rose" | "emerald" {
  if (s === "open") return "gold";
  if (s === "shipped") return "emerald";
  if (s === "cancelled") return "rose";
  return "neutral";
}

/** First of next month, as the create form's default period. */
function nextMonthFirst(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return d.toISOString().slice(0, 10);
}

/** The 10th of that month at 23:59 UTC, as the default claim deadline. */
function defaultClose(period: string): string {
  const base = new Date(`${period}T00:00:00Z`);
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 10, 23, 59, 0),
  );
  return d.toISOString();
}

export function EikonBoxTab() {
  const [panel, setPanel] = useState<Panel>("drops");
  const [drops, setDrops] = useState<AdminDrop[]>([]);
  const [activeProCount, setActiveProCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selected = useMemo(
    () => drops.find((d) => d.id === selectedId) ?? null,
    [drops, selectedId],
  );

  // No synchronous setState before the first await: these run from effects,
  // where setting state in the body cascades renders. Initial state covers
  // the first pass; Refresh re-arms from an event handler.
  const loadDrops = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/eikon-box/drops");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load drops.");
      setDrops(data.drops ?? []);
      setActiveProCount(data.activeProCount ?? 0);
      setSelectedId((prev) => prev ?? data.drops?.[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drops.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClaims = useCallback(async (dropId: string) => {
    try {
      const res = await fetch(
        `/api/admin/eikon-box/claims?dropId=${encodeURIComponent(dropId)}`,
      );
      const data = await res.json();
      if (res.ok) setClaims(data.claims ?? []);
    } catch {
      /* leave the previous roster on screen rather than blanking it */
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the mount
       probe shares its path with the Refresh button, same as HealthTab. The
       writes are all past an await; nothing lands before first paint. */
    void loadDrops();
  }, [loadDrops]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- roster
       fetch for the selected drop; writes are past an await. */
    if (selectedId) void loadClaims(selectedId);
  }, [selectedId, loadClaims]);

  async function patchDrop(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eikon-box/drops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropId: selectedId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed.");
      await loadDrops();
      if (selectedId) await loadClaims(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function patchClaims(claimIds: string[], body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eikon-box/claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimIds, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed.");
      if (selectedId) await loadClaims(selectedId);
      await loadDrops();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    const c = { claimed: 0, packed: 0, shipped: 0, lapsed: 0, cancelled: 0 };
    for (const cl of claims) {
      if (cl.status === "cancelled") c.cancelled += 1;
      else if (cl.status === "claimed") c.claimed += 1;
      else if (cl.status === "packed") c.packed += 1;
      else c.shipped += 1;
      if (cl.lapsed && cl.status !== "cancelled") c.lapsed += 1;
    }
    return c;
  }, [claims]);

  return (
    <div className="space-y-5">
      <SubTabs<Panel>
        tabs={[
          ["drops", "Drops"],
          ["claims", "Claims"],
          ["announce", "Announce"],
        ]}
        active={panel}
        onChange={setPanel}
      />

      {error && (
        <p className="rounded-[var(--adm-radius-sm)] border border-rose-400/40 bg-rose-400/[0.06] px-3 py-2 font-sans text-detail text-rose-300">
          {error}
        </p>
      )}

      {panel === "drops" && (
        <>
          <Toolbar>
            <ToolbarButton onClick={() => setCreating(true)} variant="primary">
              New drop
            </ToolbarButton>
            <ToolbarButton
              onClick={async () => {
                setLoading(true);
                await loadDrops();
              }}
              loading={loading}
            >
              Refresh
            </ToolbarButton>
          </Toolbar>

          <DataTable<AdminDrop>
            columns={[
              {
                key: "month",
                label: "Month",
                render: (d) => fmtMonth(d.period_month),
                csv: (d) => d.period_month,
              },
              { key: "title", label: "Title", render: (d) => d.title },
              {
                key: "status",
                label: "Status",
                render: (d) => <Pill tone={dropTone(d.status)}>{d.status}</Pill>,
                csv: (d) => d.status,
              },
              {
                key: "claims",
                label: "Claims",
                align: "right",
                render: (d) => d.claimsCount,
                csv: (d) => d.claimsCount,
              },
              {
                key: "outstanding",
                label: "Not shipped",
                align: "right",
                render: (d) => d.notShippedCount,
                csv: (d) => d.notShippedCount,
              },
              {
                key: "closes",
                label: "Claims close",
                render: (d) => fmtDate(d.claims_close_at),
                csv: (d) => d.claims_close_at ?? "",
              },
              {
                key: "select",
                label: "",
                align: "right",
                render: (d) => (
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    className="font-sans text-detail font-semibold text-gold underline"
                  >
                    {d.id === selectedId ? "Selected" : "Open"}
                  </button>
                ),
              },
            ]}
            rows={drops}
            rowKey={(d) => d.id}
            empty="No drops yet. Create one for next month."
            csvFilename="eikon-drops.csv"
          />

          {selected && (
            <Card
              title={selected.title}
              subtitle={`${fmtMonth(selected.period_month)} · ${selected.claimsCount} claimed`}
              accent
            >
              <DropEditor
                key={`${selected.id}:${selected.updated_at ?? ""}`}
                drop={selected}
                busy={busy}
                onPatch={patchDrop}
              />
            </Card>
          )}
        </>
      )}

      {panel === "claims" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard
              label="Claimed"
              value={counts.claimed}
              accent
              hint="Source this many"
            />
            <StatCard label="Packed" value={counts.packed} />
            <StatCard label="Shipped" value={counts.shipped} />
            <StatCard
              label="Lapsed"
              value={counts.lapsed}
              hint="Pro ended since claiming"
            />
            <StatCard
              label="Did not claim"
              value={Math.max(0, activeProCount - claims.length)}
              hint={`${activeProCount} active Pro`}
            />
          </div>

          <Toolbar>
            <ToolbarButton
              onClick={() =>
                patchClaims(
                  claims.filter((c) => c.status === "claimed").map((c) => c.id),
                  { status: "packed" },
                )
              }
              loading={busy}
              title="Freezes each address and moves the claim to packed"
            >
              Mark all claimed as packed
            </ToolbarButton>
            <ToolbarButton
              onClick={async () => {
                if (selectedId) await loadClaims(selectedId);
              }}
            >
              Refresh
            </ToolbarButton>
          </Toolbar>

          <DataTable<AdminClaim>
            columns={[
              {
                key: "claimed",
                label: "Claimed",
                render: (c) => fmtDate(c.claimedAt),
                csv: (c) => c.claimedAt,
              },
              {
                key: "name",
                label: "Name",
                render: (c) => c.address?.name ?? "—",
                csv: (c) => c.address?.name ?? "",
              },
              {
                key: "email",
                label: "Email",
                render: (c) => c.email ?? "—",
                csv: (c) => c.email ?? "",
              },
              {
                key: "line1",
                label: "Address",
                render: (c) => c.addressLine || "—",
                csv: (c) => c.address?.address.line1 ?? "",
              },
              { key: "line2", label: "", render: () => null, csv: (c) => c.address?.address.line2 ?? "" },
              { key: "city", label: "", render: () => null, csv: (c) => c.address?.address.city ?? "" },
              { key: "state", label: "", render: () => null, csv: (c) => c.address?.address.state ?? "" },
              { key: "zip", label: "", render: () => null, csv: (c) => c.address?.address.postal_code ?? "" },
              {
                key: "status",
                label: "Status",
                render: (c) => (
                  <span className="inline-flex items-center gap-1.5">
                    <Pill tone={c.status === "cancelled" ? "rose" : "neutral"}>
                      {c.status}
                    </Pill>
                    {c.lapsed && c.status !== "cancelled" && (
                      <Pill tone="rose">lapsed</Pill>
                    )}
                  </span>
                ),
                csv: (c) => c.status,
              },
              {
                key: "tracking",
                label: "Tracking",
                render: (c) => c.tracking ?? "—",
                csv: (c) => c.tracking ?? "",
              },
            ]}
            rows={claims}
            rowKey={(c) => c.id}
            empty="No claims yet."
            csvFilename={`eikon-roster-${selected?.period_month ?? "drop"}.csv`}
          />

          <div className="space-y-3">
            {claims
              .filter((c) => c.status !== "cancelled")
              .map((c) => (
                <ClaimRow
                  key={`${c.id}:${c.tracking ?? ""}`}
                  claim={c}
                  busy={busy}
                  onPatch={patchClaims}
                />
              ))}
          </div>
        </>
      )}

      {panel === "announce" && selected && (
        <AnnouncePanel drop={selected} />
      )}
      {panel === "announce" && !selected && (
        <Card title="Announce">
          <p className="font-sans text-detail text-paper/60">
            Choose a drop on the Drops tab first.
          </p>
        </Card>
      )}

      {creating && (
        <CreateDropModal
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await loadDrops();
          }}
        />
      )}
    </div>
  );
}

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
  // The caller remounts this component with a key when the underlying drop
  // changes, which is both cheaper and the reason there is no stale-draft
  // race after a save.
  const [teaser, setTeaser] = useState(drop.teaser ?? "");
  const [notes, setNotes] = useState(drop.sourcing_notes ?? "");
  const [imageUrl, setImageUrl] = useState(drop.image_url ?? "");
  const [close, setClose] = useState(
    drop.claims_close_at ? drop.claims_close_at.slice(0, 16) : "",
  );

  const legal = DROP_TRANSITIONS[drop.status] ?? [];

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="eb-teaser" className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
          Teaser (members see this)
        </label>
        <textarea id="eb-teaser"
          className={`${INPUT} min-h-[72px]`}
          value={teaser}
          onChange={(e) => setTeaser(e.target.value)}
          placeholder="Contents vary month to month; no specific item is promised."
        />
      </div>

      <div>
        <label htmlFor="eb-image" className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
          Image URL
        </label>
        <input id="eb-image"
          className={INPUT}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Upload via the Shop image manager, paste the URL here"
        />
      </div>

      <div>
        <label htmlFor="eb-close" className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
          Claims close
        </label>
        <input id="eb-close"
          type="datetime-local"
          className={INPUT}
          value={close}
          onChange={(e) => setClose(e.target.value)}
        />
        <p className="mt-1 font-sans text-caption text-paper/45">
          A drop cannot be opened without a deadline in the future. That rule
          is what makes &ldquo;an unclaimed box is not carried over&rdquo;
          enforceable.
        </p>
      </div>

      <div>
        <label htmlFor="eb-notes" className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
          Sourcing notes (never leaves this screen)
        </label>
        <textarea id="eb-notes"
          className={`${INPUT} min-h-[60px]`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Supplier, unit cost, inbound tracking"
        />
      </div>

      <Toolbar>
        <ToolbarButton
          variant="primary"
          loading={busy}
          onClick={() =>
            onPatch({
              teaser: teaser || null,
              imageUrl: imageUrl || null,
              sourcingNotes: notes || null,
              claimsCloseAt: close ? new Date(close).toISOString() : null,
            })
          }
        >
          Save
        </ToolbarButton>
        {legal.map((next) => (
          <ToolbarButton
            key={next}
            loading={busy}
            variant={next === "cancelled" ? "danger" : "default"}
            onClick={() =>
              onPatch({
                status: next,
                ...(next === "open" && close
                  ? { claimsCloseAt: new Date(close).toISOString() }
                  : {}),
              })
            }
          >
            Move to {next}
          </ToolbarButton>
        ))}
      </Toolbar>
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
  onPatch: (ids: string[], body: Record<string, unknown>) => Promise<void>;
}) {
  // Remounted by key when the tracking number changes, so no syncing effect.
  const [draft, setDraft] = useState(claim.tracking ?? "");
  const link = claim.tracking ? trackingLink(claim.tracking) : null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-detail font-semibold text-paper">
            {claim.address?.name ?? "—"}{" "}
            {claim.lapsed && <Pill tone="rose">Pro lapsed since claiming</Pill>}
          </p>
          <p className="mt-0.5 font-sans text-caption text-paper/60">
            {claim.addressLine || "No address on file"}
          </p>
          <p className="mt-0.5 font-sans text-caption text-paper/40">
            {claim.email ?? "no email"} · claimed {fmtDate(claim.claimedAt)} ·
            Pro until {fmtDate(claim.proUntilAtClaim)}
          </p>
        </div>
        <Pill>{claim.status}</Pill>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className={`${INPUT} max-w-[280px]`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tracking number"
        />
        <ToolbarButton
          loading={busy}
          onClick={() => onPatch([claim.id], { outboundTracking: draft || null })}
        >
          Save tracking
        </ToolbarButton>
        {link && (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-detail text-gold underline"
          >
            {link.carrier ?? "Track"} ↗
          </a>
        )}
        {claim.status !== "cancelled" && (
          <ToolbarButton
            variant="danger"
            loading={busy}
            onClick={() =>
              onPatch([claim.id], {
                status: "cancelled",
                cancelReason: "Cancelled by operator",
              })
            }
          >
            Cancel
          </ToolbarButton>
        )}
      </div>

      {claim.status === "shipped" && !claim.tracking && (
        <p className="mt-2 font-sans text-caption text-rose-300">
          Marked shipped with no tracking number.
        </p>
      )}
    </Card>
  );
}

function CreateDropModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState(nextMonthFirst());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eikon-box/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          periodMonth: period,
          claimsCloseAt: defaultClose(period),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the drop.");
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the drop.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="New drop"
      subtitle="Created as a draft. Opening it is a separate, deliberate step."
      onClose={onClose}
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="eb-title" className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
            Title
          </label>
          <input id="eb-title"
            className={INPUT}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The August Box"
          />
        </div>
        <div>
          <label htmlFor="eb-period" className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
            Month (first of)
          </label>
          <input id="eb-period"
            type="date"
            className={INPUT}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
        {error && (
          <p className="font-sans text-detail text-rose-300">{error}</p>
        )}
        <Toolbar>
          <ToolbarButton
            variant="primary"
            loading={busy}
            onClick={create}
          >
            Create draft
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

  const dryRun =
    preview &&
    !preview.configured.web &&
    !preview.configured.ios &&
    !preview.configured.fcm;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eikon-box/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropId: drop.id,
          push: { title, body },
          ...(withEmail ? { email: { subject } } : {}),
          confirm: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Announce failed.");
      setResult(
        `Push: ${data.push?.status ?? "skipped"} to ${data.push?.recipients ?? 0}. ` +
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
    <Card
      title={`Announce ${drop.title}`}
      subtitle="Irreversible. Opening the drop is not the same as telling everyone."
      accent
    >
      {drop.status !== "open" && (
        <p className="mb-3 rounded-[var(--adm-radius-sm)] border border-gold/40 bg-gold/[0.07] px-3 py-2 font-sans text-detail text-gold">
          This drop is {drop.status}. Open it before announcing.
        </p>
      )}
      {dryRun && (
        <p className="mb-3 rounded-[var(--adm-radius-sm)] border border-rose-400/40 bg-rose-400/[0.06] px-3 py-2 font-sans text-detail text-rose-300">
          No push credentials are configured. A send will be logged as
          &ldquo;enqueued&rdquo; and nothing will actually leave.
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor="eb-push-title" className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
            Push title ({title.length}/80)
          </label>
          <input id="eb-push-title" className={INPUT} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label htmlFor="eb-push-body" className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
            Push body ({body.length}/300)
          </label>
          <textarea id="eb-push-body"
            className={`${INPUT} min-h-[72px]`}
            value={body}
            maxLength={300}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={withEmail}
            onChange={(e) => setWithEmail(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          <span className="font-sans text-detail text-paper/70">
            Also send email
          </span>
        </label>
        {withEmail && (
          <input
            className={INPUT}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        )}

        {error && <p className="font-sans text-detail text-rose-300">{error}</p>}
        {result && (
          <p className="font-sans text-detail text-emerald-300">{result}</p>
        )}

        <Toolbar>
          {!confirming ? (
            <ToolbarButton
              variant="primary"
              onClick={() => setConfirming(true)}
              title="Two-step on purpose"
            >
              Review send
            </ToolbarButton>
          ) : (
            <>
              <ToolbarButton variant="primary" loading={busy} onClick={send}>
                Confirm: announce to {preview?.total ?? 0} members
              </ToolbarButton>
              <ToolbarButton onClick={() => setConfirming(false)}>
                Cancel
              </ToolbarButton>
            </>
          )}
        </Toolbar>
      </div>
    </Card>
  );
}
