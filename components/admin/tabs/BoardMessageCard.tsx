"use client";

// The weekly board message at the top of /whats-new, edited here.
//
// One card: the message readers see right now, every row underneath with
// Edit / Publish / Unpublish / Delete, and an inline editor with the public
// markup as its preview. Newest PUBLISHED by date is what /whats-new shows,
// so publishing an older week does not hide a newer one.

import { useState } from "react";
import { BoardMessageView } from "@/components/whats-new/BoardMessageView";
import type { BoardRow } from "@/lib/whatsNew/boardLive";
import { boardEmDashField, isoWeekOf, type BoardInput } from "@/lib/whatsNew/boardShape";
import { isoToDisplayDate } from "@/lib/whatsNew/dates";
import { Card, DataTable, Email, Modal, Pill, Toolbar, ToolbarButton } from "../primitives";

type Draft = BoardInput & { id?: string };

function toDraft(r: BoardRow): Draft {
  return {
    id: r.id,
    week: r.week,
    date: r.date,
    eyebrow: r.eyebrow ?? "",
    headline: r.headline ?? "",
    body: r.body.length > 0 ? [...r.body] : [""],
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
  return `${Math.floor(h / 24)} d ago`;
}

export function BoardMessageCard({
  rows,
  fromFallback,
  tableAbsent,
  busy,
  post,
}: {
  rows: BoardRow[];
  fromFallback: boolean;
  tableAbsent: boolean;
  busy: string | null;
  post: (key: string, body: Record<string, unknown>) => Promise<unknown | null>;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<BoardRow | null>(null);

  const canWrite = !tableAbsent && !fromFallback;
  const live = rows.filter((r) => r.status === "published").sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  async function save(d: Draft) {
    const input: BoardInput = {
      week: d.week.trim(),
      date: d.date,
      eyebrow: d.eyebrow.trim(),
      headline: d.headline.trim(),
      body: d.body.map((p) => p.trim()).filter(Boolean),
    };
    const ok = await post(d.id ? `board:${d.id}` : "board:new", {
      action: "board-upsert",
      ...(d.id ? { id: d.id } : {}),
      ...input,
    });
    if (ok) setDraft(null);
  }

  return (
    <>
      <Card
        title={`Board message · ${rows.length}`}
        subtitle={
          tableAbsent
            ? "The committed file, because the board_messages table is not applied. Read only until supabase/migrations/20260904_board_messages.sql lands."
            : fromFallback
              ? `Falling back to data/changelog/board.json, because the board_messages table is empty. /whats-new is showing the newest of these ${rows.length}. Adopt them to take over.`
              : "The note above the release notes on /whats-new. Newest published by date is the one readers see."
        }
        action={
          <Toolbar>
            {fromFallback && !tableAbsent && (
              <ToolbarButton
                variant="primary"
                onClick={() => { void post("board-adopt", { action: "board-adopt-all" }); }}
                loading={busy === "board-adopt"}
                title="Write every committed message into the table as a published row"
              >
                {busy === "board-adopt" ? "Adopting" : `Adopt all ${rows.length}`}
              </ToolbarButton>
            )}
            {canWrite && (
              <ToolbarButton
                variant="primary"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setDraft({ week: isoWeekOf(today), date: today, eyebrow: "This week at Purify", headline: "", body: [""] });
                  setTimeout(() => document.getElementById("board-editor")?.scrollIntoView({ block: "start" }), 0);
                }}
              >
                New message
              </ToolbarButton>
            )}
          </Toolbar>
        }
      >
        {live && (
          <div className="mb-4">
            <span className="mb-1 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              Live now, as a reader sees it
            </span>
            <div className="bg-night rounded-[var(--adm-radius)] px-5 pt-4 pb-1">
              <BoardMessageView
                message={{ week: live.week, date: live.date, eyebrow: live.eyebrow, headline: live.headline, body: live.body }}
              />
            </div>
          </div>
        )}

        <DataTable<BoardRow>
          columns={[
            { key: "week", label: "Week", render: (r) => <span className="tabular-nums">{r.week}</span>, csv: (r) => r.week },
            { key: "date", label: "Date", render: (r) => <span className="tabular-nums">{isoToDisplayDate(r.date)}</span>, csv: (r) => r.date },
            {
              key: "headline",
              label: "Headline",
              render: (r) => (
                <span className="block max-w-[40ch] truncate" title={r.headline}>
                  {r.headline}
                </span>
              ),
              csv: (r) => r.headline,
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <Pill tone={r.status === "published" ? "emerald" : "gold"}>
                  {r.status === "published" ? (live && live.id === r.id ? "Live" : "Published") : "Draft"}
                </Pill>
              ),
              csv: (r) => r.status,
            },
            { key: "paras", label: "Paragraphs", align: "right", render: (r) => <span className="tabular-nums">{r.body.length}</span>, csv: (r) => r.body.length },
            {
              key: "updated",
              label: "Updated",
              render: (r) =>
                r.updated_at ? (
                  <span className="inline-flex flex-col leading-tight">
                    <span className="tabular-nums">{ago(r.updated_at)}</span>
                    <span className="text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                      <Email value={r.updated_by_email} fallback="" />
                    </span>
                  </span>
                ) : (
                  <span style={{ color: "var(--adm-ink-3)" }}>file</span>
                ),
              csv: (r) => r.updated_at,
            },
            {
              key: "actions",
              label: "",
              align: "right",
              render: (r) =>
                canWrite ? (
                  <Toolbar>
                    <ToolbarButton
                      onClick={() => {
                        setDraft(toDraft(r));
                        setTimeout(() => document.getElementById("board-editor")?.scrollIntoView({ block: "start" }), 0);
                      }}
                    >
                      Edit
                    </ToolbarButton>
                    {r.status === "published" ? (
                      <ToolbarButton
                        onClick={() => { void post(`board-status:${r.id}`, { action: "board-unpublish", id: r.id }); }}
                        loading={busy === `board-status:${r.id}`}
                      >
                        Unpublish
                      </ToolbarButton>
                    ) : (
                      <ToolbarButton
                        variant="primary"
                        onClick={() => { void post(`board-status:${r.id}`, { action: "board-publish", id: r.id }); }}
                        loading={busy === `board-status:${r.id}`}
                      >
                        Publish
                      </ToolbarButton>
                    )}
                    <ToolbarButton variant="danger" onClick={() => setDeleting(r)}>
                      Delete
                    </ToolbarButton>
                  </Toolbar>
                ) : null,
            },
          ]}
          rows={rows}
          rowKey={(r) => r.id}
          csvFilename="board-messages.csv"
          empty="No board message yet. Press New message, or Adopt all to seed from the file."
        />
      </Card>

      {draft && (
        <div id="board-editor">
          <BoardEditor
            key={draft.id ?? "new"}
            initial={draft}
            busy={busy !== null && busy.startsWith("board:")}
            onSave={save}
            onCancel={() => setDraft(null)}
          />
        </div>
      )}

      {deleting && (
        <Modal
          title={`Delete ${deleting.week}?`}
          subtitle="If it is the live one, /whats-new falls back to the next newest published message. The row is kept in the audit log."
          onClose={() => setDeleting(null)}
        >
          <div className="flex justify-end gap-2">
            <ToolbarButton onClick={() => setDeleting(null)}>Keep it</ToolbarButton>
            <ToolbarButton
              variant="danger"
              loading={busy === `board-delete:${deleting.id}`}
              onClick={async () => {
                const ok = await post(`board-delete:${deleting.id}`, { action: "board-delete", id: deleting.id });
                if (ok) setDeleting(null);
              }}
            >
              Delete
            </ToolbarButton>
          </div>
        </Modal>
      )}
    </>
  );
}

function BoardEditor({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: Draft;
  busy: boolean;
  onSave: (d: Draft) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const setPara = (i: number, v: string) => setD((p) => ({ ...p, body: p.body.map((x, j) => (j === i ? v : x)) }));
  const movePara = (i: number, dir: -1 | 1) =>
    setD((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.body.length) return p;
      const body = [...p.body];
      [body[i], body[j]] = [body[j], body[i]];
      return { ...p, body };
    });
  const removePara = (i: number) =>
    setD((p) => ({ ...p, body: p.body.length === 1 ? [""] : p.body.filter((_, j) => j !== i) }));

  const fieldCls = "w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]";
  const fieldStyle = { background: "var(--adm-control)", borderColor: "var(--adm-line-strong)", color: "var(--adm-ink)" } as React.CSSProperties;
  const labelCls = "mb-1 block font-sans text-[11.5px]";
  const labelStyle = { color: "var(--adm-ink-3)" } as React.CSSProperties;

  const paras = d.body.map((p) => p.trim()).filter(Boolean);
  const dash = boardEmDashField({ ...d, body: d.body });
  const weekOk = /^\d{4}-W\d{2}$/.test(d.week.trim());
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(d.date);
  const headlineOk = d.headline.trim().length > 0;
  const canSave = !dash && weekOk && dateOk && headlineOk && paras.length > 0 && !busy;

  return (
    <Card
      title={initial.id ? `Edit ${initial.week}` : "New board message"}
      subtitle={initial.id ? "Saves to the row as it is: published stays published, draft stays draft." : "Saved as a draft. Publish it from the table when it is ready."}
      accent
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <label className="md:col-span-3">
          <span className={labelCls} style={labelStyle}>Date</span>
          <input
            className={`${fieldCls} h-11 tabular-nums`}
            style={fieldStyle}
            type="date"
            value={d.date}
            onChange={(e) => {
              const v = e.target.value;
              setD((p) => ({ ...p, date: v, week: p.id ? p.week : isoWeekOf(v) || p.week }));
            }}
          />
        </label>
        <label className="md:col-span-2">
          <span className={labelCls} style={labelStyle}>Week</span>
          <input className={`${fieldCls} h-11 tabular-nums`} style={fieldStyle} value={d.week} onChange={(e) => set("week", e.target.value)} />
        </label>
        <label className="md:col-span-7">
          <span className={labelCls} style={labelStyle}>Eyebrow</span>
          <input className={`${fieldCls} h-11`} style={fieldStyle} value={d.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
        </label>
        <label className="md:col-span-12">
          <span className={labelCls} style={labelStyle}>Headline</span>
          <input className={`${fieldCls} h-11`} style={fieldStyle} value={d.headline} onChange={(e) => set("headline", e.target.value)} />
        </label>

        <div className="md:col-span-12">
          <span className={labelCls} style={labelStyle}>Paragraphs · {paras.length}</span>
          <div className="space-y-2">
            {d.body.map((p, i) => (
              <div key={i} className="flex gap-2">
                <span className="pt-2 w-6 shrink-0 text-right font-sans text-[11.5px] tabular-nums" style={labelStyle}>
                  {i + 1}
                </span>
                <textarea className={`${fieldCls} py-2 leading-[1.6]`} style={fieldStyle} rows={4} value={p} onChange={(e) => setPara(i, e.target.value)} />
                <div className="flex shrink-0 flex-col gap-1">
                  <ToolbarButton onClick={() => movePara(i, -1)} title="Move up">↑</ToolbarButton>
                  <ToolbarButton onClick={() => movePara(i, 1)} title="Move down">↓</ToolbarButton>
                  <ToolbarButton variant="danger" onClick={() => removePara(i)} title="Remove">×</ToolbarButton>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <ToolbarButton onClick={() => setD((p) => ({ ...p, body: [...p.body, ""] }))}>Add paragraph</ToolbarButton>
          </div>
        </div>

        <div className="md:col-span-12 space-y-1 font-sans text-[12px]">
          {dash && <p style={{ color: "var(--adm-critical)" }}>The {dash} carries an em dash. Use a comma, a colon or a full stop.</p>}
          {!weekOk && <p style={{ color: "var(--adm-ink-3)" }}>Week must look like 2026-W36. It fills in from the date.</p>}
          {!dateOk && <p style={{ color: "var(--adm-ink-3)" }}>Pick a date.</p>}
          {!headlineOk && <p style={{ color: "var(--adm-ink-3)" }}>A headline is required.</p>}
          {paras.length === 0 && <p style={{ color: "var(--adm-ink-3)" }}>Write at least one paragraph.</p>}
        </div>

        <div className="md:col-span-12">
          <span className={labelCls} style={labelStyle}>Preview, as a reader sees it</span>
          <div className="bg-night rounded-[var(--adm-radius)] px-5 pt-4 pb-1">
            <BoardMessageView message={{ week: d.week, date: dateOk ? d.date : "2026-01-01", eyebrow: d.eyebrow, headline: d.headline || "Headline", body: paras }} />
          </div>
        </div>

        <div className="md:col-span-12 flex justify-end gap-2">
          <ToolbarButton onClick={onCancel}>Cancel</ToolbarButton>
          <ToolbarButton variant="primary" loading={busy} onClick={() => { if (canSave) void onSave(d); }} title={canSave ? undefined : "Fix the notes above first"}>
            Save
          </ToolbarButton>
        </div>
      </div>
    </Card>
  );
}
