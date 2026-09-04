"use client";

// Patch notes: what /whats-new publishes, edited here without a deploy, plus
// the review queue for edits the agent proposes.
//
// Three cards, top to bottom:
//   1. Review queue. Hidden when empty. Each proposed change reads like a
//      tracked change in Word: who changed what, before beside after with the
//      moved words lit up, Accept / Deny / Suggest.
//   2. The notes. Every row of patch_notes, drafts included. Falls back to the
//      committed file with an "Adopt all" when the table is empty, exactly as
//      the Costs tab does for expense lines.
//   3. The editor. One inline card, live preview in the public markup, and a
//      Save that refuses an em dash before the route has to.

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { changed, diffWords } from "@/lib/admin/textDiff";
import { ReleaseDetails } from "@/components/whats-new/ReleaseDetails";
import { isoToDisplayDate } from "@/lib/whatsNew/dates";
import { emDashField, type PatchNoteInput } from "@/lib/whatsNew/patchNoteShape";
import type { PatchNoteRow } from "@/lib/whatsNew/notes";
import type { PatchNotesPayload, RevisionRow } from "@/app/api/admin/patch-notes/route";
import { Card, DataTable, Email, Modal, Pill, Toolbar, ToolbarButton } from "../primitives";

type Draft = PatchNoteInput & { id?: string };

const EMPTY: Draft = { version: "", kind: "", date: "", title: "", blurb: "", items: [""] };

const ACTIONS = "/api/admin/patch-notes/actions";

function toDraft(n: PatchNoteRow): Draft {
  return {
    id: n.id,
    version: n.version,
    kind: n.kind ?? "",
    date: n.date,
    title: n.title ?? "",
    blurb: n.blurb ?? "",
    items: n.items.length > 0 ? [...n.items] : [""],
  };
}

function toInput(a: Record<string, unknown> | null): PatchNoteInput | null {
  if (!a) return null;
  return {
    version: String(a.version ?? ""),
    kind: String(a.kind ?? ""),
    date: String(a.date ?? ""),
    title: String(a.title ?? ""),
    blurb: String(a.blurb ?? ""),
    items: Array.isArray(a.items) ? a.items.map(String) : [],
  };
}

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
}

export function PatchNotesTab() {
  const [data, setData] = useState<PatchNotesPayload | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  // When set, the editor is the owner's counter-proposal on this revision and
  // Save posts revision-suggest rather than note-upsert.
  const [suggesting, setSuggesting] = useState<RevisionRow | null>(null);
  const [denying, setDenying] = useState<RevisionRow | null>(null);
  const [deleting, setDeleting] = useState<PatchNoteRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const j = await adminJson<PatchNotesPayload>("/api/admin/patch-notes");
    if (j) setData(j);
  }, []);

  useEffect(() => {
    let alive = true;
    adminJson<PatchNotesPayload>("/api/admin/patch-notes").then((j) => {
      if (alive && j) setData(j);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** One write. Returns the JSON on success, sets the error and returns null otherwise. */
  async function post(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    try {
      const r = await fetch(ACTIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; detail?: unknown };
      if (!r.ok) {
        setError(j.error ?? `Request failed (${r.status})`);
        return null;
      }
      await reload();
      return j;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  const notesByVersion = useMemo(() => {
    const m = new Map<string, PatchNoteRow>();
    for (const n of data?.notes ?? []) m.set(n.version, n);
    return m;
  }, [data]);

  if (!data) {
    return <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>;
  }

  const canWrite = !data.tableAbsent && !data.fromFallback;

  async function saveDraft(d: Draft, note?: string) {
    const items = d.items.map((s) => s.trim()).filter(Boolean);
    const input: PatchNoteInput = {
      version: d.version.trim(),
      kind: d.kind.trim(),
      date: d.date,
      title: d.title.trim(),
      blurb: d.blurb.trim(),
      items,
    };
    if (suggesting) {
      if (!note || !note.trim()) return;
      const ok = await post(`suggest:${suggesting.id}`, {
        action: "revision-suggest",
        id: suggesting.id,
        after: input,
        note: note.trim(),
      });
      if (ok) {
        setSuggesting(null);
        setDraft(null);
      }
      return;
    }
    const ok = await post(d.id ? `save:${d.id}` : "save:new", {
      action: "note-upsert",
      ...(d.id ? { id: d.id } : {}),
      ...input,
    });
    if (ok) setDraft(null);
  }

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12.5px]"
          style={{
            color: "var(--adm-critical)",
            borderColor: "color-mix(in oklab, var(--adm-critical), transparent 60%)",
            background: "color-mix(in oklab, var(--adm-critical), transparent 94%)",
          }}
        >
          {error}
        </p>
      )}

      {data.tableAbsent && (
        <Card title="Not applied yet" accent>
          <p className="font-sans text-[12.5px] leading-[1.6]" style={{ color: "var(--adm-ink-2)" }}>
            The patch_notes table does not exist in this database. /whats-new is publishing the
            committed file, data/changelog/entries.json, and will keep doing so until
            supabase/migrations/20260904_patch_notes.sql is applied. Nothing here can be edited
            until then. The list below is the file, read only.
          </p>
        </Card>
      )}

      {data.revisions.length > 0 && (
        <Card
          title={`Review queue · ${data.revisions.length}`}
          subtitle="Proposed changes, oldest first. Accept applies it to the note. Deny closes it. Suggest lets you rewrite it and send it back with a note."
          accent
        >
          <div className="space-y-4">
            {data.revisions.map((rev) => (
              <RevisionCard
                key={rev.id}
                rev={rev}
                live={notesByVersion.get(rev.version) ?? null}
                busy={busy}
                onAccept={() => { void post(`accept:${rev.id}`, { action: "revision-accept", id: rev.id }); }}
                onDeny={() => setDenying(rev)}
                onSuggest={() => {
                  const after = toInput(rev.after);
                  if (!after) return;
                  setSuggesting(rev);
                  setDraft({ ...after, items: after.items.length > 0 ? after.items : [""] });
                  // The editor is the last card; bring it into view.
                  setTimeout(() => document.getElementById("patch-note-editor")?.scrollIntoView({ block: "start" }), 0);
                }}
              />
            ))}
          </div>
        </Card>
      )}

      <Card
        title={`Release notes · ${data.notes.length}`}
        subtitle={
          data.tableAbsent
            ? "The committed file, because the table is not applied."
            : data.fromFallback
              ? `Falling back to data/changelog/entries.json, because the patch_notes table is empty. /whats-new is publishing these ${data.notes.length} committed entries. Adopt them to take over.`
              : "Lives on /whats-new. Published rows show to readers; drafts show only here. Edits propagate without a redeploy."
        }
        action={
          <Toolbar>
            {data.fromFallback && !data.tableAbsent && (
              <ToolbarButton
                variant="primary"
                onClick={() => { void post("adopt", { action: "adopt-all" }); }}
                loading={busy === "adopt"}
                title="Write every committed entry into the table as a published row"
              >
                {busy === "adopt" ? "Adopting" : `Adopt all ${data.notes.length}`}
              </ToolbarButton>
            )}
            {canWrite && (
              <ToolbarButton
                variant="primary"
                onClick={() => {
                  setSuggesting(null);
                  setDraft({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
                }}
              >
                New note
              </ToolbarButton>
            )}
          </Toolbar>
        }
      >
        <DataTable<PatchNoteRow>
          columns={[
            {
              key: "version",
              label: "Version",
              render: (n) => (
                <span className="font-semibold tabular-nums" style={{ color: "var(--adm-ink)" }}>
                  {n.version}
                </span>
              ),
              csv: (n) => n.version,
            },
            {
              key: "kind",
              label: "Headline",
              render: (n) => (
                <span className="block max-w-[34ch] truncate" title={n.kind}>
                  {n.kind || <span style={{ color: "var(--adm-ink-3)" }}>none</span>}
                </span>
              ),
              csv: (n) => n.kind,
            },
            {
              key: "date",
              label: "Date",
              render: (n) => <span className="tabular-nums">{isoToDisplayDate(n.date)}</span>,
              csv: (n) => n.date,
            },
            {
              key: "status",
              label: "Status",
              render: (n) => (
                <Pill tone={n.status === "published" ? "emerald" : "gold"}>
                  {n.status === "published" ? "Published" : "Draft"}
                </Pill>
              ),
              csv: (n) => n.status,
            },
            {
              key: "items",
              label: "Items",
              align: "right",
              render: (n) => <span className="tabular-nums">{n.items.length}</span>,
              csv: (n) => n.items.length,
            },
            {
              key: "updated",
              label: "Updated",
              render: (n) =>
                n.updated_at ? (
                  <span className="inline-flex flex-col leading-tight">
                    <span className="tabular-nums">{ago(n.updated_at)}</span>
                    <span className="text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                      <Email value={n.updated_by_email} fallback="" />
                    </span>
                  </span>
                ) : (
                  <span style={{ color: "var(--adm-ink-3)" }}>file</span>
                ),
              csv: (n) => n.updated_at,
            },
            {
              key: "actions",
              label: "",
              align: "right",
              render: (n) =>
                canWrite ? (
                  <Toolbar>
                    <ToolbarButton
                      onClick={() => {
                        setSuggesting(null);
                        setDraft(toDraft(n));
                        setTimeout(() => document.getElementById("patch-note-editor")?.scrollIntoView({ block: "start" }), 0);
                      }}
                    >
                      Edit
                    </ToolbarButton>
                    {n.status === "published" ? (
                      <ToolbarButton
                        onClick={() => { void post(`status:${n.id}`, { action: "note-unpublish", id: n.id }); }}
                        loading={busy === `status:${n.id}`}
                        title="Take it off /whats-new. The row stays as a draft."
                      >
                        Unpublish
                      </ToolbarButton>
                    ) : (
                      <ToolbarButton
                        variant="primary"
                        onClick={() => { void post(`status:${n.id}`, { action: "note-publish", id: n.id }); }}
                        loading={busy === `status:${n.id}`}
                        title="Put it on /whats-new"
                      >
                        Publish
                      </ToolbarButton>
                    )}
                    <ToolbarButton variant="danger" onClick={() => setDeleting(n)}>
                      Delete
                    </ToolbarButton>
                  </Toolbar>
                ) : null,
            },
          ]}
          rows={data.notes}
          rowKey={(n) => n.id}
          csvFilename="patch-notes.csv"
          empty="No release notes yet. Press New note, or Adopt all to seed from the file."
        />
      </Card>

      {draft && (
        <div id="patch-note-editor">
          <NoteEditor
            key={suggesting ? `suggest:${suggesting.id}` : (draft.id ?? "new")}
            initial={draft}
            mode={suggesting ? "suggest" : draft.id ? "edit" : "new"}
            currentVersion={data.currentVersion}
            knownVersions={new Set(data.notes.map((n) => n.version))}
            busy={busy !== null && busy.startsWith(suggesting ? "suggest:" : "save:")}
            onSave={saveDraft}
            onCancel={() => {
              setDraft(null);
              setSuggesting(null);
            }}
          />
        </div>
      )}

      {denying && (
        <DenyModal
          rev={denying}
          busy={busy === `deny:${denying.id}`}
          onClose={() => setDenying(null)}
          onDeny={async (note) => {
            const ok = await post(`deny:${denying.id}`, {
              action: "revision-deny",
              id: denying.id,
              ...(note ? { note } : {}),
            });
            if (ok) setDenying(null);
          }}
        />
      )}

      {deleting && (
        <Modal
          title={`Delete ${deleting.version}?`}
          subtitle="It comes off /whats-new at once. The full row is kept in the audit log."
          onClose={() => setDeleting(null)}
        >
          <div className="flex justify-end gap-2">
            <ToolbarButton onClick={() => setDeleting(null)}>Keep it</ToolbarButton>
            <ToolbarButton
              variant="danger"
              loading={busy === `delete:${deleting.id}`}
              onClick={async () => {
                const ok = await post(`delete:${deleting.id}`, { action: "note-delete", id: deleting.id });
                if (ok) setDeleting(null);
              }}
            >
              Delete
            </ToolbarButton>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Review queue ──────────────────────────────────────────────────────────

function RevisionCard({
  rev,
  live,
  busy,
  onAccept,
  onDeny,
  onSuggest,
}: {
  rev: RevisionRow;
  live: PatchNoteRow | null;
  busy: string | null;
  onAccept: () => void;
  onDeny: () => void;
  onSuggest: () => void;
}) {
  const before = toInput(rev.before);
  const after = toInput(rev.after);
  const [showAll, setShowAll] = useState(false);
  if (!after) return null;

  // The diff is against the snapshot the proposal was made from. If the live
  // row has moved since, say so: accepting would overwrite the newer edit.
  const liveInput = live
    ? toInput({ version: live.version, kind: live.kind, date: live.date, title: live.title, blurb: live.blurb, items: live.items })
    : null;
  const stale =
    before && liveInput && JSON.stringify(before) !== JSON.stringify(liveInput);

  const who = rev.author === "claude" ? "Claude" : rev.author;
  const suggested = rev.status === "suggested";

  return (
    <article
      className="rounded-[var(--adm-radius)] border p-4"
      style={{
        borderColor: suggested
          ? "color-mix(in oklab, var(--adm-warn), transparent 55%)"
          : "color-mix(in oklab, var(--adm-accent), transparent 65%)",
        background: suggested
          ? "color-mix(in oklab, var(--adm-warn), transparent 95%)"
          : "color-mix(in oklab, var(--adm-accent), transparent 96%)",
      }}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="font-sans text-[13.5px] font-semibold" style={{ color: "var(--adm-ink)" }}>
            {rev.summary}
          </p>
          <p className="mt-0.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {who} · {ago(rev.created_at)}
            {rev.parent_id ? " · answers an earlier suggestion" : ""}
            {!before ? " · new note" : live ? ` · ${live.status}` : " · the note is not in the table"}
          </p>
        </div>
        <Toolbar>
          <ToolbarButton onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Changed only" : "Show all fields"}
          </ToolbarButton>
        </Toolbar>
      </header>

      {suggested && (
        <p
          className="mt-3 rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12.5px] leading-[1.55]"
          style={{ color: "var(--adm-ink-2)", borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
        >
          <span className="font-semibold" style={{ color: "var(--adm-ink)" }}>
            Waiting on Claude.
          </span>{" "}
          {rev.reviewed_by_email ?? "You"} sent this back {rev.reviewed_at ? ago(rev.reviewed_at) : ""}:{" "}
          <span className="italic">{rev.review_note}</span>
        </p>
      )}

      {stale && (
        <p className="mt-3 font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
          The note has been edited since this was proposed. Before shows the snapshot the proposal
          was made from; accepting replaces what is there now.
        </p>
      )}

      <div className="mt-3 space-y-2">
        <FieldDiff label="Version" before={before?.version ?? ""} after={after.version} isNew={!before} showAll={showAll} />
        <FieldDiff label="Headline" before={before?.kind ?? ""} after={after.kind} isNew={!before} showAll={showAll} />
        <FieldDiff
          label="Date"
          before={before ? isoToDisplayDate(before.date) : ""}
          after={isoToDisplayDate(after.date)}
          isNew={!before}
          showAll={showAll}
        />
        <FieldDiff label="Title" before={before?.title ?? ""} after={after.title} isNew={!before} showAll={showAll} />
        <FieldDiff label="Blurb" before={before?.blurb ?? ""} after={after.blurb} isNew={!before} showAll={showAll} />
        {Array.from({ length: Math.max(before?.items.length ?? 0, after.items.length) }).map((_, i) => (
          <FieldDiff
            key={i}
            label={`Item ${i + 1}`}
            before={before?.items[i] ?? ""}
            after={after.items[i] ?? ""}
            isNew={!before}
            showAll={showAll}
          />
        ))}
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <ToolbarButton onClick={onSuggest} title="Rewrite it in the editor and send it back to Claude with a note">
          Suggest
        </ToolbarButton>
        <ToolbarButton variant="danger" onClick={onDeny} loading={busy === `deny:${rev.id}`}>
          Deny
        </ToolbarButton>
        <ToolbarButton
          variant="primary"
          onClick={onAccept}
          loading={busy === `accept:${rev.id}`}
          title={before ? "Write the After column into the note" : "Create the note as a draft"}
        >
          Accept
        </ToolbarButton>
      </footer>
    </article>
  );
}

function FieldDiff({
  label,
  before,
  after,
  isNew,
  showAll,
}: {
  label: string;
  before: string;
  after: string;
  isNew: boolean;
  showAll: boolean;
}) {
  const moved = isNew ? after.length > 0 : changed(before, after);
  if (!moved && !showAll) return null;

  const cell = "rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12.5px] leading-[1.6] whitespace-pre-wrap break-words";
  const cellStyle = { borderColor: "var(--adm-line)", background: "var(--adm-panel)", color: "var(--adm-ink-2)" } as React.CSSProperties;

  if (!moved) {
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_1fr]">
        <span className="font-sans text-[11.5px] uppercase tracking-[0.06em] pt-2" style={{ color: "var(--adm-ink-3)" }}>
          {label}
        </span>
        <div className={cell} style={{ ...cellStyle, color: "var(--adm-ink-3)" }}>
          {after || <span className="italic">empty</span>}
        </div>
      </div>
    );
  }

  const ops = diffWords(before, after);
  const gone = before.length > 0 && after.length === 0;

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_1fr_1fr]">
      <span className="font-sans text-[11.5px] uppercase tracking-[0.06em] pt-2" style={{ color: "var(--adm-ink-3)" }}>
        {label}
        {gone && <span className="ml-1 normal-case tracking-normal" style={{ color: "var(--adm-critical)" }}>removed</span>}
        {isNew && <span className="ml-1 normal-case tracking-normal" style={{ color: "var(--adm-good)" }}>new</span>}
      </span>
      <div className={cell} style={cellStyle} aria-label={`${label}, before`}>
        {isNew ? (
          <span className="italic" style={{ color: "var(--adm-ink-3)" }}>nothing yet</span>
        ) : (
          ops.map((o, i) =>
            o.kind === "add" ? null : (
              <span
                key={i}
                style={
                  o.kind === "del"
                    ? {
                        color: "var(--adm-critical)",
                        textDecoration: "line-through",
                        background: "color-mix(in oklab, var(--adm-critical), transparent 88%)",
                      }
                    : undefined
                }
              >
                {o.text}
              </span>
            ),
          )
        )}
      </div>
      <div className={cell} style={cellStyle} aria-label={`${label}, after`}>
        {gone ? (
          <span className="italic" style={{ color: "var(--adm-ink-3)" }}>removed</span>
        ) : (
          ops.map((o, i) =>
            o.kind === "del" ? null : (
              <span
                key={i}
                style={
                  o.kind === "add"
                    ? {
                        color: "var(--adm-good)",
                        textDecoration: "underline",
                        textDecorationThickness: "1.5px",
                        background: "color-mix(in oklab, var(--adm-good), transparent 88%)",
                      }
                    : undefined
                }
              >
                {o.text}
              </span>
            ),
          )
        )}
      </div>
    </div>
  );
}

function DenyModal({
  rev,
  busy,
  onClose,
  onDeny,
}: {
  rev: RevisionRow;
  busy: boolean;
  onClose: () => void;
  onDeny: (note: string) => void | Promise<void>;
}) {
  const [note, setNote] = useState("");
  return (
    <Modal title="Deny this change?" subtitle={rev.summary} onClose={onClose}>
      <label className="block">
        <span className="mb-1 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Why, in a line. Optional; Claude reads it next session.
        </span>
        <textarea
          className="w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12.5px] leading-[1.55]"
          style={{ background: "var(--adm-control)", borderColor: "var(--adm-line-strong)", color: "var(--adm-ink)" }}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
        <ToolbarButton variant="danger" loading={busy} onClick={() => onDeny(note.trim())}>
          Deny
        </ToolbarButton>
      </div>
    </Modal>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────

function NoteEditor({
  initial,
  mode,
  currentVersion,
  knownVersions,
  busy,
  onSave,
  onCancel,
}: {
  initial: Draft;
  mode: "new" | "edit" | "suggest";
  currentVersion: string;
  knownVersions: Set<string>;
  busy: boolean;
  onSave: (d: Draft, note?: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  // Only in suggest mode: the sentence that goes back to Claude with the rewrite.
  const [note, setNote] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, v: string) =>
    setD((p) => ({ ...p, items: p.items.map((it, j) => (j === i ? v : it)) }));
  const moveItem = (i: number, dir: -1 | 1) =>
    setD((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.items.length) return p;
      const items = [...p.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...p, items };
    });
  const removeItem = (i: number) =>
    setD((p) => ({ ...p, items: p.items.length === 1 ? [""] : p.items.filter((_, j) => j !== i) }));

  const fieldCls = "w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]";
  const fieldStyle = {
    background: "var(--adm-control)",
    borderColor: "var(--adm-line-strong)",
    color: "var(--adm-ink)",
  } as React.CSSProperties;
  const labelCls = "mb-1 block font-sans text-[11.5px]";
  const labelStyle = { color: "var(--adm-ink-3)" } as React.CSSProperties;

  const cleanItems = d.items.map((s) => s.trim()).filter(Boolean);
  const dash = emDashField({ ...d, items: d.items });
  const versionOk = d.version.trim().length > 0;
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(d.date);
  const noteOk = mode !== "suggest" || note.trim().length > 0;
  const canSave = !dash && versionOk && dateOk && noteOk && !busy;

  const aheadOfRelease =
    mode !== "suggest" &&
    d.version.trim() !== currentVersion &&
    !knownVersions.has(d.version.trim()) &&
    d.version.trim().length > 0;

  const title =
    mode === "suggest"
      ? "Suggest a rewrite"
      : mode === "edit"
        ? `Edit ${initial.version}`
        : "New note";
  const subtitle =
    mode === "suggest"
      ? "Your version goes back to Claude with a note. Nothing is published from here."
      : mode === "edit"
        ? "Saves to the row as it is: a published note stays published, a draft stays a draft."
        : "Saved as a draft. Publish it from the table when it is ready.";

  return (
    <Card title={title} subtitle={subtitle} accent>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <label className="md:col-span-2">
          <span className={labelCls} style={labelStyle}>Version</span>
          <input className={`${fieldCls} h-11 tabular-nums`} style={fieldStyle} value={d.version} onChange={(e) => set("version", e.target.value)} />
        </label>
        <label className="md:col-span-3">
          <span className={labelCls} style={labelStyle}>Date</span>
          <input className={`${fieldCls} h-11 tabular-nums`} style={fieldStyle} type="date" value={d.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        <label className="md:col-span-7">
          <span className={labelCls} style={labelStyle}>Headline (the line beside the version)</span>
          <input className={`${fieldCls} h-11`} style={fieldStyle} value={d.kind} onChange={(e) => set("kind", e.target.value)} />
        </label>
        <label className="md:col-span-12">
          <span className={labelCls} style={labelStyle}>Title (short, for the hero chip; not shown on /whats-new yet)</span>
          <input className={`${fieldCls} h-11`} style={fieldStyle} value={d.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label className="md:col-span-12">
          <span className={labelCls} style={labelStyle}>Blurb</span>
          <textarea className={`${fieldCls} py-2 leading-[1.6]`} style={fieldStyle} rows={5} value={d.blurb} onChange={(e) => set("blurb", e.target.value)} />
        </label>

        <div className="md:col-span-12">
          <span className={labelCls} style={labelStyle}>Items · {cleanItems.length}</span>
          <div className="space-y-2">
            {d.items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <span className="pt-2 w-6 shrink-0 text-right font-sans text-[11.5px] tabular-nums" style={labelStyle}>
                  {i + 1}
                </span>
                <textarea
                  className={`${fieldCls} py-2 leading-[1.6]`}
                  style={fieldStyle}
                  rows={3}
                  value={it}
                  onChange={(e) => setItem(i, e.target.value)}
                />
                <div className="flex shrink-0 flex-col gap-1">
                  <ToolbarButton onClick={() => moveItem(i, -1)} title="Move up">↑</ToolbarButton>
                  <ToolbarButton onClick={() => moveItem(i, 1)} title="Move down">↓</ToolbarButton>
                  <ToolbarButton variant="danger" onClick={() => removeItem(i)} title="Remove">×</ToolbarButton>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <ToolbarButton onClick={() => setD((p) => ({ ...p, items: [...p.items, ""] }))}>Add item</ToolbarButton>
          </div>
        </div>

        {mode === "suggest" && (
          <label className="md:col-span-12">
            <span className={labelCls} style={labelStyle}>Note to Claude (required): what to do differently</span>
            <textarea
              className={`${fieldCls} py-2 leading-[1.6]`}
              style={fieldStyle}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Keep the first sentence, drop the numbers, and say who reported it."
            />
          </label>
        )}

        <div className="md:col-span-12 space-y-1 font-sans text-[12px]">
          {dash && (
            <p style={{ color: "var(--adm-critical)" }}>
              The {dash} carries an em dash. Release notes may not; use a comma, a colon or a full stop.
            </p>
          )}
          {!versionOk && <p style={{ color: "var(--adm-ink-3)" }}>A version is required.</p>}
          {!dateOk && <p style={{ color: "var(--adm-ink-3)" }}>Pick a date.</p>}
          {!noteOk && <p style={{ color: "var(--adm-ink-3)" }}>Write the note to Claude first.</p>}
          {aheadOfRelease && (
            <p style={{ color: "var(--adm-warn)" }}>
              {d.version.trim()} is not the current release ({currentVersion}). Publishing it puts the
              text on /whats-new, but the New badge will not re-arm until version.ts is bumped in a
              release, and AGENTS.md forbids notes that claim what production does not yet do.
            </p>
          )}
        </div>

        <div className="md:col-span-12">
          <span className={labelCls} style={labelStyle}>Preview, as a reader sees it</span>
          <div className="bg-night rounded-[var(--adm-radius)] p-4">
            <ReleaseDetails
              entry={{
                version: d.version || "0.0",
                kind: d.kind,
                date: isoToDisplayDate(d.date),
                blurb: d.blurb,
                items: cleanItems,
              }}
            />
          </div>
        </div>

        <div className="md:col-span-12 flex justify-end gap-2">
          <ToolbarButton onClick={onCancel}>Cancel</ToolbarButton>
          <ToolbarButton
            variant="primary"
            loading={busy}
            onClick={() => {
              if (canSave) void onSave(d, mode === "suggest" ? note.trim() : undefined);
            }}
            title={canSave ? undefined : "Fix the notes above first"}
          >
            {mode === "suggest" ? "Send back to Claude" : "Save"}
          </ToolbarButton>
        </div>
      </div>
    </Card>
  );
}
