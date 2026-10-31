"use client";

// Patch notes: what /whats-new publishes, edited here without a deploy, plus
// the review queue for edits the agent proposes.
//
// Since his pick A for Releases on r3-17 (2026-10-30) these are parts of the
// one path (components/admin/tabs/DropTab.tsx), not a tab of their own:
//   - NoteReview is step 1's tool: each proposed change reads like a tracked
//     change, which fields moved, before beside after with the moved words
//     marked, and Suggest, Deny and Accept on it. The step that waits on him.
//   - NotesRecord is "Release notes" under Records: every row of
//     patch_notes, drafts included, falling back to the committed file with
//     an "Adopt all" when the table is empty, and the editor, one inline
//     card with a live preview and a Save that refuses an em dash before the
//     route has to.
//   - usePatchNotes is the one read both use, and the board's.
//
// A release may go by a name beside its number (lib/whatsNew/releaseName.ts).
// The editor has a field for it beside the version. It is shut on a patch,
// which goes by its release's name, and shut until the table has the column
// that holds it; either way every other field saves as it always did. A
// rewrite sent back to Claude is the exception to the second: it is kept in
// the queue, not the table, so its name can always be changed or cleared.

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { changed, diffWords } from "@/lib/admin/textDiff";
import { ReleaseDetails } from "@/components/whats-new/ReleaseDetails";
import { isoToDisplayDate } from "@/lib/whatsNew/dates";
import { emDashField, type PatchNoteInput } from "@/lib/whatsNew/patchNoteShape";
import type { PatchNoteRow } from "@/lib/whatsNew/notes";
import {
  NAME_HAS_TEXT,
  NAME_ONE_LINE,
  RELEASE_NAME_MAX,
  cleanName,
  ownsName,
  proposedName,
  releaseName,
} from "@/lib/whatsNew/releaseName";
import { featureRelease } from "@/lib/whatsNew/version";
import {
  UPDATE_CATEGORIES,
  categoryById,
  coverage,
  itemCategory,
  itemText,
  normaliseItems,
  type NoteItem,
  type UpdateCategoryId,
} from "@/lib/whatsNew/updateHierarchy";
import type { PatchNotesPayload, RevisionRow } from "@/app/api/admin/patch-notes/route";
import { Card, DataTable, Email, Mark, Modal, Pill, Select, SubTabs, Toolbar, ToolbarButton } from "../primitives";
import { GLOW, LIT } from "../tools/look";

/**
 * One line as the editor holds it: always an object, so a category can be set
 * or cleared without the line changing type under the textarea. "" means the
 * line is not filed under a category, which is how every note before 1.4 reads.
 */
type EditorItem = { text: string; category: UpdateCategoryId | "" };

type Draft = Omit<PatchNoteInput, "items"> & { id?: string; items: EditorItem[] };

const BLANK_ITEM: EditorItem = { text: "", category: "" };

const EMPTY: Draft = { version: "", name: "", kind: "", date: "", title: "", blurb: "", items: [BLANK_ITEM] };

const ACTIONS = "/api/admin/patch-notes/actions";

function toEditorItems(items: readonly NoteItem[]): EditorItem[] {
  const out = items.map((it): EditorItem => ({ text: itemText(it), category: itemCategory(it) ?? "" }));
  return out.length > 0 ? out : [BLANK_ITEM];
}

/** Editor lines back to stored items: trimmed, empties dropped, category kept. */
function toNoteItems(items: readonly EditorItem[]): NoteItem[] {
  const out: NoteItem[] = [];
  for (const it of items) {
    const text = it.text.trim();
    if (!text) continue;
    out.push(it.category ? { category: it.category, text } : text);
  }
  return out;
}

/** A line as the review queue shows it, with its category in front. */
function itemLabel(it: NoteItem | undefined): string {
  if (it === undefined) return "";
  const cat = itemCategory(it);
  return cat ? `[${categoryById(cat).label}] ${itemText(it)}` : itemText(it);
}

function toDraft(n: PatchNoteRow): Draft {
  return {
    id: n.id,
    version: n.version,
    name: cleanName(n.name),
    kind: n.kind ?? "",
    date: n.date,
    title: n.title ?? "",
    blurb: n.blurb ?? "",
    items: toEditorItems(n.items),
  };
}

function toInput(a: Record<string, unknown> | null): PatchNoteInput | null {
  if (!a) return null;
  return {
    version: String(a.version ?? ""),
    // A proposal filed before names existed has no name key and reads as none
    // here. The review card and the accept route keep the note's own instead
    // (proposedName).
    name: cleanName(a.name),
    kind: String(a.kind ?? ""),
    date: String(a.date ?? ""),
    title: String(a.title ?? ""),
    blurb: String(a.blurb ?? ""),
    items: normaliseItems(a.items),
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

/** The patch notes read, and its one way to write. Shared by step 1, the notes and the board. */
export function usePatchNotes() {
  const [data, setData] = useState<PatchNotesPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const j = await adminJson<PatchNotesPayload>("/api/admin/patch-notes");
    if (j) setData(j);
  }, []);

  useEffect(() => {
    let alive = true;
    adminJson<PatchNotesPayload>("/api/admin/patch-notes").then((j) => {
      if (!alive) return;
      if (j) setData(j);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** One write. Returns the JSON on success, sets the error and returns null otherwise. */
  const post = useCallback(
    async (key: string, body: Record<string, unknown>) => {
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
    },
    [reload],
  );

  return { data, failed, busy, error, post, reload };
}

export type PatchNotes = ReturnType<typeof usePatchNotes>;

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
      {error}
    </p>
  );
}

/**
 * Step 1's tool: Claude's proposals for the release's notes, oldest first,
 * each a tracked change with Suggest, Deny and Accept on it. A rewrite sent
 * back opens the editor as a sheet over the path.
 */
export function NoteReview({ notes, versions }: { notes: PatchNotes; versions: readonly string[] }) {
  const { data, busy, error, post } = notes;
  const [suggesting, setSuggesting] = useState<{ rev: RevisionRow; draft: Draft } | null>(null);
  const [denying, setDenying] = useState<RevisionRow | null>(null);

  const notesByVersion = useMemo(() => {
    const m = new Map<string, PatchNoteRow>();
    for (const n of data?.notes ?? []) m.set(n.version, n);
    return m;
  }, [data]);

  if (!data) return null;
  // The release's own notes first; a proposal on another note is still shown,
  // after them, so nothing proposed is out of sight.
  const revisions = [...data.revisions].sort((a, b) => Number(!versions.includes(a.version)) - Number(!versions.includes(b.version)));
  if (revisions.length === 0) return null;

  async function sendBack(d: Draft, note?: string) {
    if (!suggesting || !note || !note.trim()) return;
    const items = toNoteItems(d.items);
    const ok = await post(`suggest:${suggesting.rev.id}`, {
      action: "revision-suggest",
      id: suggesting.rev.id,
      after: {
        version: d.version.trim(),
        name: ownsName(d.version) ? d.name.trim() : "",
        kind: d.kind.trim(),
        date: d.date,
        title: d.title.trim(),
        blurb: d.blurb.trim(),
        items,
      },
      note: note.trim(),
    });
    if (ok) setSuggesting(null);
  }

  return (
    <div className="space-y-3">
      <ErrorLine error={error} />
      {revisions.map((rev, i) => (
        <RevisionCard
          key={rev.id}
          rev={rev}
          live={notesByVersion.get(rev.version) ?? null}
          lit={i === 0}
          busy={busy}
          onAccept={() => {
            void post(`accept:${rev.id}`, { action: "revision-accept", id: rev.id });
          }}
          onDeny={() => setDenying(rev)}
          onSuggest={() => {
            const after = toInput(rev.after);
            if (!after) return;
            // A proposal filed before names existed says nothing about the
            // name, so the rewrite starts from the one the note has and
            // sending it back does not take that name off.
            const name = proposedName(rev.after, notesByVersion.get(rev.version));
            setSuggesting({ rev, draft: { ...after, name, items: toEditorItems(after.items) } });
          }}
        />
      ))}

      {suggesting ? (
        <Modal title="Suggest a rewrite" subtitle={suggesting.rev.summary} onClose={() => setSuggesting(null)} wide>
          <NoteEditor
            key={`suggest:${suggesting.rev.id}`}
            initial={suggesting.draft}
            mode="suggest"
            currentVersion={data.currentVersion}
            knownVersions={new Set(data.notes.map((n) => n.version))}
            notes={data.notes}
            nameReady={data.nameReady}
            busy={busy !== null && busy.startsWith("suggest:")}
            onSave={sendBack}
            onCancel={() => setSuggesting(null)}
          />
        </Modal>
      ) : null}

      {denying ? (
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
      ) : null}
    </div>
  );
}

/**
 * "Release notes" under Records: every note, its state and its editor.
 * Publishing a note on What's New happens here, from the row.
 */
export function NotesRecord({ notes }: { notes: PatchNotes }) {
  const { data, failed, busy, error, post } = notes;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<PatchNoteRow | null>(null);

  if (!data) {
    return (
      <p className="py-6 text-center font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {failed ? "The notes did not load. Reloading asks again." : "Reading the notes."}
      </p>
    );
  }

  const canWrite = !data.tableAbsent && !data.fromFallback;

  async function saveDraft(d: Draft) {
    const items = toNoteItems(d.items);
    const input: PatchNoteInput = {
      version: d.version.trim(),
      // A patch has no name of its own to send: it goes by its release's.
      name: ownsName(d.version) ? d.name.trim() : "",
      kind: d.kind.trim(),
      date: d.date,
      title: d.title.trim(),
      blurb: d.blurb.trim(),
      items,
    };
    const ok = await post(d.id ? `save:${d.id}` : "save:new", {
      action: "note-upsert",
      ...(d.id ? { id: d.id } : {}),
      ...input,
    });
    if (ok) setDraft(null);
  }

  return (
    <div className="space-y-5">
      <ErrorLine error={error} />

      {data.tableAbsent && (
        <Card title="Not applied yet" accent>
          <p className="font-sans text-[12.5px] leading-[1.6]" style={{ color: "var(--adm-ink-2)" }}>
            The patch_notes table does not exist in this database. /whats-new is publishing the
            committed file, data/changelog/entries.json, and will keep doing so until
            supabase/migrations/20260904000100_patch_notes.sql is applied. Nothing here can be edited
            until then. The list below is the file, read only.
          </p>
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
                onClick={() => setDraft({ ...EMPTY, date: new Date().toISOString().slice(0, 10) })}
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
              render: (n) => {
                // The name it shows to readers: its own, or its release's on a patch.
                const name = releaseName(n.version, data.notes);
                return (
                  <span className="font-semibold tabular-nums" style={{ color: "var(--adm-ink)" }}>
                    {n.version}
                    {name ? (
                      <>
                        {" "}
                        <span className="font-normal" style={{ color: "var(--adm-ink-2)" }}>
                          {name}
                        </span>
                      </>
                    ) : null}
                  </span>
                );
              },
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
            key={draft.id ?? "new"}
            initial={draft}
            mode={draft.id ? "edit" : "new"}
            currentVersion={data.currentVersion}
            knownVersions={new Set(data.notes.map((n) => n.version))}
            notes={data.notes}
            nameReady={data.nameReady}
            busy={busy !== null && busy.startsWith("save:")}
            onSave={saveDraft}
            onCancel={() => setDraft(null)}
          />
        </div>
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

/**
 * One proposed change, as the path's step 1 draws it (his pick A on r3-17):
 * which fields moved and how many there are, before beside after with the
 * moved words marked (struck out, and underlined), and Suggest, Deny and
 * Accept on its foot. On a phone it shows the after alone, with Show before.
 */
function RevisionCard({
  rev,
  live,
  lit,
  busy,
  onAccept,
  onDeny,
  onSuggest,
}: {
  rev: RevisionRow;
  live: PatchNoteRow | null;
  /** The first open proposal: the one thing on the page that waits on him. */
  lit: boolean;
  busy: string | null;
  onAccept: () => void;
  onDeny: () => void;
  onSuggest: () => void;
}) {
  const before = toInput(rev.before);
  const after = toInput(rev.after);
  const [showAll, setShowAll] = useState(false);
  const [showBefore, setShowBefore] = useState(false);
  if (!after) return null;

  // A proposal that says nothing about the name keeps the note's own when it
  // is accepted (proposedName, as the accept route reads it). The Name row
  // shows that: kept on both sides, not taken off.
  const keptName = rev.after && !("name" in rev.after) ? proposedName(rev.after, live) : null;

  // The diff is against the snapshot the proposal was made from. If the live
  // row has moved since, say so: accepting would overwrite the newer edit.
  const liveInput = live
    ? toInput({ version: live.version, name: live.name, kind: live.kind, date: live.date, title: live.title, blurb: live.blurb, items: live.items })
    : null;
  const stale = before && liveInput && JSON.stringify(before) !== JSON.stringify(liveInput);

  const who = rev.author === "claude" ? "Claude" : rev.author;
  const suggested = rev.status === "suggested";

  const rows: { label: string; before: string; after: string }[] = [
    { label: "Version", before: before?.version ?? "", after: after.version },
    { label: "Name", before: keptName ?? before?.name ?? "", after: keptName ?? after.name },
    { label: "Headline", before: before?.kind ?? "", after: after.kind },
    { label: "Date", before: before ? isoToDisplayDate(before.date) : "", after: isoToDisplayDate(after.date) },
    { label: "Title", before: before?.title ?? "", after: after.title },
    { label: "Blurb", before: before?.blurb ?? "", after: after.blurb },
    ...Array.from({ length: Math.max(before?.items.length ?? 0, after.items.length) }).map((_, i) => ({
      label: `Item ${i + 1}`,
      before: itemLabel(before?.items[i]),
      after: itemLabel(after.items[i]),
    })),
  ];
  const moved = rows.filter((r) => (before ? changed(r.before, r.after) : r.after.length > 0));
  const shown = showAll ? rows : moved;
  // "Blurb and item 3", "Headline, blurb and item 3": the fields that moved.
  const names = moved.map((r, i) => (i === 0 ? r.label : r.label.charAt(0).toLowerCase() + r.label.slice(1)));
  const heading =
    names.length === 0 ? "Nothing" : names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const draft = live?.status !== "published";

  return (
    <article
      className="overflow-hidden rounded-[var(--adm-radius)] border"
      style={lit ? { ...LIT, background: "var(--adm-panel)" } : { borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-3.5 py-2.5" style={{ borderColor: "var(--adm-line)" }}>
        <span className="font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
          {before ? heading : `A new note, ${after.version}`}
        </span>
        <span className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          {before ? `${moved.length} of ${rows.length} fields changed` : ""}
          {rev.parent_id ? " · answers an earlier suggestion" : ""}
        </span>
        <span className="ml-auto">
          <SubTabs<"changed" | "all">
            tabs={[
              ["changed", "Changed only"],
              ["all", "All fields"],
            ]}
            active={showAll ? "all" : "changed"}
            onChange={(v) => setShowAll(v === "all")}
          />
        </span>
      </header>

      <div className="space-y-1 px-3.5 pt-2.5">
        <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          {who}: {rev.summary}
        </p>
        {suggested && (
          <p className="font-sans text-[12.5px] leading-[1.55]" style={{ color: "var(--adm-ink-2)" }}>
            <span className="font-semibold" style={{ color: "var(--adm-ink)" }}>
              Waiting on Claude.
            </span>{" "}
            {rev.reviewed_by_email ?? "You"} sent this back {rev.reviewed_at ? ago(rev.reviewed_at) : ""}:{" "}
            <span className="italic">{rev.review_note}</span>
          </p>
        )}
        {stale && (
          <p className="font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
            The note has been edited since this was proposed. Before shows the snapshot the proposal was made from;
            accepting replaces what is there now.
          </p>
        )}
      </div>

      <div className="mt-1">
        {shown.map((r) => (
          <FieldDiff key={r.label} label={r.label} before={r.before} after={r.after} isNew={!before} showBefore={showBefore} />
        ))}
      </div>

      {before ? (
        <div className="px-3.5 pb-1 md:hidden">
          <button
            type="button"
            onClick={() => setShowBefore((v) => !v)}
            className="min-h-11 font-sans text-[12px] underline underline-offset-[3px]"
            style={{ color: "var(--adm-ink-2)" }}
          >
            {showBefore ? "Hide before" : "Show before"}
          </button>
        </div>
      ) : null}

      <footer className="grid grid-cols-3 items-center gap-2 border-t px-3.5 py-2.5 md:flex md:flex-wrap" style={{ borderColor: "var(--adm-line)" }}>
        <ToolbarButton onClick={onSuggest} title="Rewrite it in the editor and send it back to Claude with a note">
          Suggest
        </ToolbarButton>
        <ToolbarButton variant="danger" onClick={onDeny} loading={busy === `deny:${rev.id}`}>
          Deny
        </ToolbarButton>
        <span className="hidden flex-1 text-right font-sans text-[12px] md:block" style={{ color: "var(--adm-ink-3)" }}>
          {draft ? `${after.version} stays a draft until you publish it` : "Accepting changes what readers see on What's New"}
        </span>
        <span className="grid rounded-[var(--adm-radius-sm)] md:inline-flex" style={lit ? { boxShadow: GLOW } : undefined}>
          <ToolbarButton
            variant="primary"
            onClick={onAccept}
            loading={busy === `accept:${rev.id}`}
            title={before ? "Write the After column into the note" : "Create the note as a draft"}
          >
            Accept
          </ToolbarButton>
        </span>
      </footer>
    </article>
  );
}

function FieldDiff({
  label,
  before,
  after,
  isNew,
  showBefore,
}: {
  label: string;
  before: string;
  after: string;
  isNew: boolean;
  /** On a phone the before column is hidden until asked for. */
  showBefore: boolean;
}) {
  const moved = isNew ? after.length > 0 : changed(before, after);
  const cell = "px-3.5 py-2 font-sans text-[12.5px] leading-[1.6] whitespace-pre-wrap break-words";
  const ops = moved ? diffWords(before, after) : [];
  const gone = before.length > 0 && after.length === 0;
  const del = { color: "var(--adm-ink-3)", textDecoration: "line-through", textDecorationThickness: "1px" } as React.CSSProperties;
  const add = {
    color: "var(--adm-ink)",
    textDecoration: "underline",
    textDecorationThickness: "1.5px",
    textUnderlineOffset: "3px",
    background: "var(--adm-hover)",
    borderRadius: 2,
  } as React.CSSProperties;

  return (
    <div className="grid grid-cols-1 border-t md:grid-cols-2" style={{ borderColor: "var(--adm-line)" }}>
      <div className={`${cell} ${showBefore ? "" : "hidden md:block"} md:border-r`} style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-2)" }} aria-label={`${label}, before`}>
        <span className="mb-0.5 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          {label}, before
        </span>
        {isNew ? (
          <span className="italic" style={{ color: "var(--adm-ink-3)" }}>nothing yet</span>
        ) : !moved ? (
          before || <span className="italic" style={{ color: "var(--adm-ink-3)" }}>empty</span>
        ) : (
          ops.map((o, i) => (o.kind === "add" ? null : <span key={i} style={o.kind === "del" ? del : undefined}>{o.text}</span>))
        )}
      </div>
      <div className={cell} style={{ color: "var(--adm-ink)" }} aria-label={`${label}, after`}>
        <span className="mb-0.5 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          {label}, after{gone ? ": removed" : ""}
        </span>
        {gone ? (
          <span className="italic" style={{ color: "var(--adm-ink-3)" }}>removed</span>
        ) : !moved ? (
          after || <span className="italic" style={{ color: "var(--adm-ink-3)" }}>empty</span>
        ) : (
          ops.map((o, i) => (o.kind === "del" ? null : <span key={i} style={o.kind === "add" ? add : undefined}>{o.text}</span>))
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
  notes,
  nameReady,
  busy,
  onSave,
  onCancel,
}: {
  initial: Draft;
  mode: "new" | "edit" | "suggest";
  currentVersion: string;
  knownVersions: Set<string>;
  /** Every note in the list, for the name a patch goes by. */
  notes: readonly PatchNoteRow[];
  /** False until the table has the column a name is saved in. */
  nameReady: boolean;
  busy: boolean;
  onSave: (d: Draft, note?: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  // Only in suggest mode: the sentence that goes back to Claude with the rewrite.
  const [note, setNote] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<EditorItem>) =>
    setD((p) => ({ ...p, items: p.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const moveItem = (i: number, dir: -1 | 1) =>
    setD((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.items.length) return p;
      const items = [...p.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...p, items };
    });
  const removeItem = (i: number) =>
    setD((p) => ({ ...p, items: p.items.length === 1 ? [BLANK_ITEM] : p.items.filter((_, j) => j !== i) }));

  const fieldCls = "w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]";
  const fieldStyle = {
    background: "var(--adm-control)",
    borderColor: "var(--adm-line-strong)",
    color: "var(--adm-ink)",
  } as React.CSSProperties;
  const labelCls = "mb-1 block font-sans text-[11.5px]";
  const labelStyle = { color: "var(--adm-ink-3)" } as React.CSSProperties;

  const cleanItems = toNoteItems(d.items);
  const dash = emDashField({ ...d, items: d.items.map((it) => it.text) });
  // What the Update Hierarchy will ask of this note at release time. Shown,
  // not enforced here: a draft is allowed to be half written, and the refusal
  // belongs to the release test, which also reads the skip reasons.
  const filed = coverage(cleanItems);
  const anyFiled = UPDATE_CATEGORIES.some((c) => filed[c.id] > 0);
  const versionOk = d.version.trim().length > 0;
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(d.date);
  const noteOk = mode !== "suggest" || note.trim().length > 0;
  // The name belongs to the release. A patch (1.6.1) goes by its release's
  // (1.6), so its field is shut and shows that one; nothing is sent for it.
  const isPatch = versionOk && !ownsName(d.version);
  const shownName = isPatch ? releaseName(d.version, notes) : d.name;
  const nameOk = isPatch || d.name.trim().length <= RELEASE_NAME_MAX;
  // A pasted name can carry a tab or a mark nobody can see, and the route
  // refuses the whole note for it without saying which field. Say it here.
  const typedName = d.name.trim();
  const namePlain =
    isPatch || (NAME_ONE_LINE.test(typedName) && (typedName === "" || NAME_HAS_TEXT.test(typedName)));
  // A rewrite sent back to Claude is kept in the queue, which needs no name
  // column. So the field stays open in suggest mode even before the column is
  // there: it is how a proposal goes back without the name it carries.
  const nameWritable = nameReady || mode === "suggest";
  const canSave = !dash && versionOk && dateOk && nameOk && namePlain && noteOk && !busy;

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
        <label className="md:col-span-6">
          <span className={labelCls} style={labelStyle}>
            {isPatch
              ? `Name (${d.version.trim()} goes by the name of ${featureRelease(d.version.trim())})`
              : "Name (optional, shown beside the version)"}
          </span>
          <input
            className={`${fieldCls} h-11 disabled:opacity-60`}
            style={fieldStyle}
            value={shownName}
            maxLength={RELEASE_NAME_MAX}
            disabled={isPatch || !nameWritable}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <label className="md:col-span-4">
          <span className={labelCls} style={labelStyle}>Date</span>
          <input className={`${fieldCls} h-11 tabular-nums`} style={fieldStyle} type="date" value={d.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        <label className="md:col-span-12">
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
                <div className="min-w-0 flex-1 space-y-1">
                  <Select
                    ariaLabel={`Category for item ${i + 1}`}
                    value={it.category}
                    onChange={(v) => setItem(i, { category: v as EditorItem["category"] })}
                    options={[
                      { value: "", label: "No category" },
                      ...UPDATE_CATEGORIES.map((c) => ({
                        value: c.id as string,
                        label: `${c.rank}. ${c.label}`,
                        icon: c.emoji,
                      })),
                    ]}
                  />
                  <textarea
                    className={`${fieldCls} py-2 leading-[1.6]`}
                    style={fieldStyle}
                    rows={3}
                    value={it.text}
                    onChange={(e) => setItem(i, { text: e.target.value })}
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <ToolbarButton onClick={() => moveItem(i, -1)} title="Move up">↑</ToolbarButton>
                  <ToolbarButton onClick={() => moveItem(i, 1)} title="Move down">↓</ToolbarButton>
                  <ToolbarButton variant="danger" onClick={() => removeItem(i)} title="Remove">×</ToolbarButton>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <ToolbarButton onClick={() => setD((p) => ({ ...p, items: [...p.items, BLANK_ITEM] }))}>Add item</ToolbarButton>
          </div>
        </div>

        {/* The Update Hierarchy, as this draft stands. Each row is shipped (it
            has lines) or needs a skip reason in the release checklist. */}
        <div className="md:col-span-12">
          <span className={labelCls} style={labelStyle}>
            Update Hierarchy · {UPDATE_CATEGORIES.filter((c) => filed[c.id] > 0).length} of 6 have lines
          </span>
          <ul
            className="grid grid-cols-1 gap-1 rounded-[var(--adm-radius-sm)] border p-2 sm:grid-cols-2"
            style={{ borderColor: "var(--adm-line)" }}
          >
            {UPDATE_CATEGORIES.map((c) => {
              const n = filed[c.id];
              return (
                <li key={c.id} className="flex items-baseline justify-between gap-2 px-1 font-sans text-[12px]">
                  <span style={{ color: n > 0 ? "var(--adm-ink)" : "var(--adm-ink-3)" }}>
                    <Mark className="mr-1">{c.emoji}</Mark>
                    {c.rank}. {c.label}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{ color: n > 0 ? "var(--adm-good)" : "var(--adm-ink-3)" }}
                  >
                    {n > 0 ? `${n} line${n === 1 ? "" : "s"}` : "needs a skip reason"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-1 font-sans text-[11.5px]" style={labelStyle}>
            {anyFiled
              ? "Categories with no lines need a reason in data/changelog/checklists/<version>.json before the release bump. Readers never see the reasons."
              : "No line is filed under a category yet. From 1.4, every release accounts for all six, see docs/UPDATE-HIERARCHY.md."}
          </p>
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
          {!nameOk && (
            <p style={{ color: "var(--adm-critical)" }}>
              The name is longer than {RELEASE_NAME_MAX} characters. Shorten it.
            </p>
          )}
          {!namePlain && (
            <p style={{ color: "var(--adm-critical)" }}>
              The name carries a character that is not plain text, such as a tab or an unseen
              direction mark. Type the name again by hand.
            </p>
          )}
          {!nameReady && !isPatch && mode !== "suggest" && (
            <p style={{ color: "var(--adm-ink-3)" }}>
              A name cannot be saved yet: the patch_notes table needs its name column first. Every
              other field saves as usual.
            </p>
          )}
          {!nameReady && !isPatch && mode === "suggest" && d.name.trim().length > 0 && (
            <p style={{ color: "var(--adm-ink-3)" }}>
              The patch_notes table has no name column yet, so a proposal that carries a name
              cannot be accepted. Clear the name to send it back without one.
            </p>
          )}
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
                name: shownName,
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
