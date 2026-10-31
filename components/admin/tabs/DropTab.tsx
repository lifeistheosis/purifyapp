"use client";

// Releases, his pick A on r3-17 (2026-10-30): one path.
//
// "A release has an order, and the email cannot go before the note. The path
// shows the next thing and puts each tool where it is used, the way the drop
// file already thinks." The release is one page, in the drop's order: the
// note, the stores, the announcement, the day a store has it, a few days
// later, a week later. The step that waits on him is open, lit, with its tool
// inside it (Claude's proposed change to the note, before beside after, with
// Accept); every other step is one line that opens on a tap.
//
// The four tabs this was are folded into it, and each old link lands on its
// place: Patch notes on the note (step 1, its proposals) with the notes under
// Records; Email on the day a store has it (step 4, the release email) with
// what is going out and who has been written to under Records; Push on a few
// days later (step 5, the notification) with what was sent under Records.
// The path's words and states are lib/admin/releasePath.ts.
//
// TWO HALVES, as before. The words come from the bundle (lib/drop/current.ts
// carries each release's drop.json), so every piece is drawn even when the
// server says nothing. What is true this minute comes from /api/admin/drop:
// the days he planned, what he marked as sent, which notes What's New is
// really showing, and what the drop's own rules say. It sends nothing by
// itself: the release email goes through its own card with its own confirm,
// the notification through the composer's, and "Mark sent" only writes down
// that he did. The server refuses a mark the drop's order does not allow yet.

import Image from "next/image";
import { useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { checkLine, openingStep, pathSteps, standing, stepRight, type Focus, type LiveState, type PathStep } from "@/lib/admin/releasePath";
import type { Finding } from "@/lib/drop/check";
import { CURRENT_DROP, DROPS, DROP_RELEASE } from "@/lib/drop/current";
import { countdown, dueDays, isDay, localDay, shortDay } from "@/lib/drop/days";
import { CHANNELS, PHONE_WALK, hasOwnWords, measured, pasted, type Drop, type Moment, type Piece } from "@/lib/drop/kit";
import { STORES, STORE_NAME, liveDrop, type Plan } from "@/lib/drop/live";
import { numbersSql } from "@/lib/drop/numbers";
import { copyText } from "@/lib/ui/copyText";

import { DROP_CARDS } from "../drop/cards.generated";
import { CampaignCard } from "../email/CampaignCard";
import { Mark, Pill, Select, StatusDot, ToolbarButton } from "../primitives";
import { EmailRecord, useEmailOps } from "../releases/email";
import { NoteReview, NotesRecord, usePatchNotes, type PatchNotes } from "../releases/notes";
import { PushComposer, PushRecord, usePushCount } from "../releases/push";
import { LIT, ink, ink2, ink3, line } from "../tools/look";
import { BoardMessageCard } from "./BoardMessageCard";

type Live = LiveState & {
  release: string | null;
  ready: boolean;
  error?: string;
  plan: Plan;
  /** The newest note the site is showing. */
  showing: string | null;
  findings: Finding[];
  counts: { sent: number; waits: number; ready: number; empty: number };
  /** Every line of every covered note, as one text. */
  whole: string;
  today: string;
};

type RecordId = "notes" | "board" | "push" | "going" | "people" | "next" | "words";

const RECORD_TITLE: Record<RecordId, string> = {
  notes: "Release notes",
  board: "Board messages",
  push: "Notifications sent",
  going: "Emails going out",
  people: "Who Purify has written to",
  next: "Coming next",
  words: "What the release says",
};

const field = { borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" } as const;
const FIELD = "min-h-9 rounded-[var(--adm-radius-sm)] border px-2.5 py-1.5 font-sans text-[12.5px]";
const SMALL = "font-sans text-[12.5px] leading-[1.6]";

const WHO = { owner: "Yours", us: "Ours, on your word" } as const;

/** The mark of a step: a box, ticked once the step is done. */
function StepBox({ done }: { done: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-[4.5px] shrink-0" style={ink}>
      <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="2.4" />
      {done ? <path d="m6.6 10.3 2.4 2.4 4.4-5.1" /> : null}
    </svg>
  );
}

export function DropTab() {
  return <ReleasesPage />;
}

/** What every part of the page reads and does, handed down once. */
type Ctx = {
  drop: Drop;
  here: Live | null;
  current: boolean;
  canSave: boolean;
  busy: string | null;
  copied: string | null;
  wordsOf: (piece: Piece) => string;
  change: (key: string, body: Record<string, unknown>) => Promise<void>;
  copy: (key: string, text: string) => void;
  openRecord: (id: RecordId) => void;
};

function CopyButton({ ctx, id, text, label }: { ctx: Ctx; id: string; text: string; label: string }) {
  return <ToolbarButton onClick={() => ctx.copy(id, text)}>{ctx.copied === id ? "Copied" : label}</ToolbarButton>;
}

export function ReleasesPage({ focus = null }: { focus?: Focus | null }) {
  const [release, setRelease] = useState<string>(DROP_RELEASE);
  const drop: Drop | null = DROPS[release] ?? CURRENT_DROP;
  const current = drop?.release === DROP_RELEASE;
  const [live, setLive] = useState<Live | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [record, setRecord] = useState<RecordId | null>(null);
  const [opened, setOpened] = useState<Partial<Record<Moment, boolean>>>({});
  const [now, setNow] = useState(0);
  const notes = usePatchNotes();
  const pushCount = usePushCount();
  const email = useEmailOps();

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => setNow(Date.now()), 0);
    (async () => {
      const d = await adminJson<Live>("/api/admin/drop");
      if (!alive) return;
      if (d?.release) setLive(d);
      else setFailed(true);
    })();
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  if (!drop) {
    return (
      <section className="rounded-[var(--adm-radius)] border px-4 py-3.5" style={line}>
        <p className="font-sans text-[13.5px] font-semibold" style={ink}>
          No drop for {DROP_RELEASE} yet
        </p>
        <p className={`${SMALL} mt-1`} style={ink2}>
          A release is not finished until people have been told. A drop is one file that holds every piece that goes out:
          the stores&apos; texts, the Discord posts, the board, the release email, the captions and the steps between them.
          It is started from the release&apos;s note, in the repository, with <code>node scripts/drop.mjs new {DROP_RELEASE}</code>.
        </p>
      </section>
    );
  }

  const here: Live | null = current ? live : null;

  /** One change to the plan. The server answers with the drop as it now stands. */
  async function change(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setSaid(null);
    try {
      const res = await fetch("/api/admin/drop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => null)) as (Live & { ok?: boolean; error?: string }) | null;
      if (!res.ok || !data?.ok) setSaid(data?.error ?? `That did not save (${res.status}).`);
      else setLive(data);
    } catch (e) {
      setSaid((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function copy(key: string, text: string) {
    if (await copyText(text)) {
      setCopied(key);
      window.setTimeout(() => setCopied((n) => (n === key ? null : n)), 1600);
    } else {
      setSaid("The clipboard refused. Open the piece and copy it by hand.");
    }
  }

  // The whole note comes from the server, which reads the published notes.
  // The week's SQL is written out here, from the file with the marks laid
  // over it, so it starts on the day the announcement was marked as sent.
  const wordsOf = (piece: Piece) =>
    piece.channel === "notes-all"
      ? (here?.whole ?? "")
      : piece.channel === "sql"
        ? numbersSql(here ? liveDrop(drop, here.plan, null) : drop)
        : (piece.text ?? "");

  const ctx: Ctx = {
    drop,
    here,
    current,
    canSave: Boolean(here?.ready),
    busy,
    copied,
    wordsOf,
    change,
    copy: (key, text) => void copy(key, text),
    openRecord: setRecord,
  };

  const dropDay = drop.day && isDay(drop.day) ? drop.day : null;
  const steps = pathSteps(drop, here, notes.data?.revisions ?? [], now || Date.parse(`${localDay()}T12:00:00Z`));
  const opening = openingStep(steps, focus);

  // Every message, and so not the SQL: it is run, never sent.
  const everything = drop.pieces
    .filter((p) => CHANNELS[p.channel].paste && !CHANNELS[p.channel].runs && wordsOf(p))
    .map((p) => `${p.title}\n${p.where ?? CHANNELS[p.channel].where}\n\n${p.channel === "notes-all" ? wordsOf(p) : pasted(p)}`)
    .join(`\n\n${"=".repeat(48)}\n\n`);

  const upcoming = here?.plan.upcoming.filter((u) => !u.done) ?? [];
  const going = (email.ops?.jobs ?? []).filter((j) => j.status === "running" || j.status === "paused").length;
  const figures: Record<RecordId, string> = {
    notes: notes.data ? String(notes.data.notes.length) : "",
    board: notes.data ? String(notes.data.board.length) : "",
    push: pushCount === null ? "" : String(pushCount),
    going: email.ops ? (going ? String(going) : "none") : "",
    people: "",
    next: upcoming.length ? `${upcoming[0].version} planned` : here ? "none" : "",
    words: `${drop.points.length} points`,
  };
  const releases = Object.values(DROPS).sort((a, b) => (a.release < b.release ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full md:w-[440px]">
          <Select<string>
            ariaLabel="Which release"
            value={drop.release}
            onChange={(v) => {
              setRelease(v);
              setRecord(null);
              setOpened({});
            }}
            options={releases.map((d) => ({ value: d.release, label: `Purify ${d.release} · ${d.name}` }))}
          />
        </div>
        <span className="font-sans text-[12.5px]" style={ink3}>
          {dropDay ? `Drop day ${shortDay(dropDay)}, ${countdown(dropDay, localDay())}` : "No drop day set"}
          {drop.occasion ? `, ${drop.occasion}` : ""}
        </span>
        <span className="hidden flex-1 md:block" />
        <CopyButton ctx={ctx} id="everything" text={everything} label="Copy every message" />
      </div>

      {!current ? (
        <p className={SMALL} style={ink3}>
          A past release: what its drop file records. Days and marks are kept for {DROP_RELEASE}, the current release.
        </p>
      ) : failed ? (
        <p className={SMALL} style={{ color: "var(--adm-warn)" }}>
          The plan and the marks did not load, so days and marks cannot be saved right now. Every piece is still here to read and copy.
        </p>
      ) : here && !here.ready ? (
        <p className={SMALL} style={{ color: "var(--adm-warn)" }}>
          The Calendar&apos;s table could not be read, so days and marks cannot be saved{here.error ? ` (${here.error})` : ""}.
        </p>
      ) : null}
      {said ? (
        <p role="alert" className={SMALL} style={{ color: "var(--adm-critical)" }}>
          {said}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
        <div className="min-w-0">
          {record ? (
            <section>
              <button type="button" onClick={() => setRecord(null)} className="mb-3 inline-flex min-h-11 items-center gap-1.5 font-sans text-[13px]" style={ink2}>
                <span aria-hidden>‹</span> The release
              </button>
              <h2 className="mb-3 font-sans text-[16px] font-semibold" style={ink}>
                {RECORD_TITLE[record]}
              </h2>
              <RecordView ctx={ctx} id={record} notes={notes} />
            </section>
          ) : (
            <ol>
              {steps.map((s, i) => (
                <Step
                  key={s.moment}
                  ctx={ctx}
                  step={s}
                  last={i === steps.length - 1}
                  open={opened[s.moment] ?? s.moment === opening}
                  onToggle={(v) => setOpened((o) => ({ ...o, [s.moment]: v }))}
                  notes={notes}
                />
              ))}
            </ol>
          )}
        </div>
        <aside>
          <Records record={record} figures={figures} onOpen={(id) => setRecord(record === id ? null : id)} here={here} current={current} failed={failed} />
        </aside>
      </div>
    </div>
  );
}

/** One step of the path: its node, its line, and when open its tool and pieces. */
function Step({
  ctx,
  step: s,
  last,
  open,
  onToggle,
  notes,
}: {
  ctx: Ctx;
  step: PathStep;
  last: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
  notes: PatchNotes;
}) {
  const right = stepRight(s);
  return (
    <li className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3.5 pb-4">
      {last ? null : (
        <span
          aria-hidden
          className="absolute bottom-0 left-[11.5px] top-[26px] border-l"
          style={{ borderColor: s.state === "done" ? "var(--adm-ink-3)" : "var(--adm-line-strong)", borderStyle: s.state === "done" ? "solid" : "dashed" }}
        />
      )}
      <span
        aria-hidden
        className="relative z-[1] grid size-6 place-items-center rounded-full border font-mono text-[11px]"
        style={
          s.state === "done"
            ? { background: "var(--adm-ink)", borderColor: "var(--adm-ink)", color: "var(--adm-on-accent)" }
            : s.state === "current"
              ? { ...LIT, color: "var(--adm-ink)", background: "var(--adm-bg)" }
              : { borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-3)", background: "var(--adm-bg)" }
        }
      >
        {s.state === "done" ? (
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" />
          </svg>
        ) : (
          s.n
        )}
      </span>
      <div className="min-w-0">
        <button type="button" onClick={() => onToggle(!open)} aria-expanded={open} className="flex w-full items-start gap-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-[11.5px]" style={ink3}>
              {s.eyebrow}
            </span>
            <span className="mt-0.5 block font-sans text-[14px] font-semibold" style={s.state === "done" ? ink2 : ink}>
              {s.title}
            </span>
            {s.meta ? (
              <span className="mt-0.5 block font-sans text-[12.5px]" style={ink3}>
                {s.meta}
              </span>
            ) : null}
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 pt-0.5 font-sans text-[12px]" style={s.waitsOnYou ? { ...ink, fontWeight: 600 } : ink3}>
            {s.waitsOnYou ? (
              <span
                aria-hidden
                className="inline-block size-[7px] rounded-full"
                style={{ boxShadow: "inset 0 0 0 1.5px var(--adm-ink), 0 0 9px 1px color-mix(in oklab, var(--adm-ink), transparent 50%)" }}
              />
            ) : null}
            {right}
          </span>
        </button>
        {open ? <StepBody ctx={ctx} step={s} notes={notes} /> : null}
      </div>
    </li>
  );
}

/** A step opened: its tool (the note's review, the notification), its pieces, and its day. */
function StepBody({ ctx, step: s, notes }: { ctx: Ctx; step: PathStep; notes: PatchNotes }) {
  const { drop, here, current } = ctx;
  const pushPiece = s.pieces.find((p) => p.channel === "push");
  const notePiece = s.pieces.find((p) => p.channel === "note");
  const noteVersion = notePiece ? notePiece.id.replace(/^note-/, "") : drop.version;
  const noteShowing = here?.notes.find((n) => n.version === noteVersion)?.published;
  return (
    <div className="mt-3 space-y-3">
      {s.moment === "ready" && current ? (
        <>
          <NoteReview notes={notes} versions={drop.covers} />
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-sans text-[12.5px]" style={ink3}>
            <span className="inline-flex items-center gap-2">
              <StatusDot tone={noteShowing ? "good" : "wait"} />
              {noteShowing ? `${noteVersion} is on What's New` : `Then publish ${noteVersion} on What's New`}
            </span>
            <span className="inline-flex items-center gap-2">
              <StatusDot tone={here?.plan.done["step-pull-notes"] ? "good" : "wait"} />
              Then bring the note into the apps (ours)
            </span>
          </div>
        </>
      ) : null}
      {s.moment === "after" && current && pushPiece ? (
        <div className="rounded-[var(--adm-radius)] border px-3.5 py-3" style={{ ...line, background: "var(--adm-panel)" }}>
          <PushComposer initial={{ title: pushPiece.subject, body: pushPiece.text }} />
        </div>
      ) : null}
      {s.moment === "numbers" ? (
        <div className="space-y-1">
          {drop.numbers?.length ? (
            drop.numbers.map((read) => (
              <p key={`${read.on}-${read.words}`} className={SMALL} style={ink2}>
                Read out {shortDay(read.on)}: &ldquo;{read.words}&rdquo;
              </p>
            ))
          ) : (
            <p className={SMALL} style={ink3}>
              Not read out yet. Run the SQL below once the first week is over, and read us the rows.
            </p>
          )}
        </div>
      ) : null}
      <ul>
        {s.pieces.map((p) => (
          <PieceRow key={p.id} ctx={ctx} piece={p} />
        ))}
      </ul>
      {s.moment === "submit" || s.moment === "stores" ? <StoresControl ctx={ctx} /> : null}
      <DayControl ctx={ctx} moment={s.moment} />
    </div>
  );
}

/** One piece: its words to read and copy, its state, and its mark. */
function PieceRow({ ctx, piece }: { ctx: Ctx; piece: Piece }) {
  const { drop, here, canSave, busy, current } = ctx;
  const channel = CHANNELS[piece.channel];
  const words = ctx.wordsOf(piece);
  // Google Play's notes are counted language by language: the longest is the one that has to fit.
  const size = measured(channel, words);
  const state = standing(drop, piece, here);
  const marked = Boolean(here?.plan.done[piece.id]);
  const canMark = canSave && piece.channel !== "note" && !piece.waits && !piece.sent;
  return (
    <li className="space-y-2 border-t py-3 first:border-t-0 first:pt-0" style={line}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        {piece.channel === "step" ? <StepBox done={state.tone === "emerald"} /> : <Mark className="text-[15px] leading-6">{channel.icon}</Mark>}
        <div className="min-w-[10rem] flex-1">
          <p className="font-sans text-[13px] font-semibold" style={ink}>
            {piece.title}
          </p>
          <p className="font-sans text-[11.5px]" style={ink3}>
            {piece.where ?? channel.where}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {channel.limit && hasOwnWords(piece) ? (
            <Pill tone={size.count > channel.limit ? "rose" : "neutral"}>
              {size.languages > 1 ? `${size.languages} languages, longest ` : ""}
              {size.count} / {channel.limit}
            </Pill>
          ) : null}
          {piece.who ? <Pill>{WHO[piece.who]}</Pill> : null}
          <Pill tone={state.tone}>{state.label}</Pill>
        </div>
      </div>
      {piece.waits ? (
        <p className={SMALL} style={{ color: "var(--adm-warn)" }}>
          Waits on: {piece.waits}
        </p>
      ) : null}
      {piece.note ? (
        <p className={SMALL} style={ink3}>
          {piece.note}
        </p>
      ) : null}
      {channel.paste && words ? (
        <details className="rounded-[var(--adm-radius-sm)] border" style={{ ...line, background: "var(--adm-panel-2)" }}>
          <summary className="cursor-pointer px-3 py-2 font-sans text-[12px] font-medium" style={ink2}>
            Read it
          </summary>
          <div className="space-y-2 px-3 pb-3">
            {piece.subject ? (
              <p className="font-sans text-[12.5px] font-semibold" style={ink}>
                {piece.subject}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-[1.6]" style={ink2}>
              {words}
            </p>
          </div>
        </details>
      ) : !channel.paste && words ? (
        <p className={SMALL} style={ink2}>
          {words}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {channel.paste && piece.subject ? <CopyButton ctx={ctx} id={`s-${piece.id}`} text={piece.subject} label="Copy title" /> : null}
        {channel.paste && words ? <CopyButton ctx={ctx} id={`t-${piece.id}`} text={words} label={piece.subject ? "Copy text" : "Copy"} /> : null}
        {canMark || marked ? (
          <ToolbarButton loading={busy === piece.id} onClick={() => ctx.change(piece.id, { action: "mark", piece: piece.id, done: !marked })}>
            {marked
              ? "Take the mark back"
              : (channel.paste && !channel.runs) || piece.channel === "cards" || piece.channel === "video"
                ? "Mark sent"
                : "Mark done"}
          </ToolbarButton>
        ) : null}
        {piece.channel === "note" ? (
          <button type="button" onClick={() => ctx.openRecord("notes")} className="min-h-11 font-sans text-[12.5px] underline underline-offset-2" style={ink2}>
            Open the notes
          </button>
        ) : null}
      </div>
      {piece.channel === "email" && current ? <CampaignCard only="release" /> : null}
    </li>
  );
}

/** The day a moment is planned for, kept on the Calendar. */
function DayControl({ ctx, moment }: { ctx: Ctx; moment: Moment }) {
  const { drop, here, canSave, busy, current } = ctx;
  if (!current) return null;
  const planned = here?.plan.moments[moment] ?? "";
  const due = drop.day && isDay(drop.day) ? dueDays(drop.day).find((d) => d.moment === moment) : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3" style={line}>
      <label className="flex items-center gap-2 font-sans text-[12px]" style={ink3}>
        <span>Planned for</span>
        <input
          type="date"
          className={FIELD}
          style={field}
          value={planned}
          disabled={!canSave || busy === `plan-${moment}`}
          onChange={(e) => void ctx.change(`plan-${moment}`, { action: "plan", moment, dueOn: e.target.value || null })}
        />
      </label>
      {planned ? (
        <ToolbarButton loading={busy === `plan-${moment}`} onClick={() => ctx.change(`plan-${moment}`, { action: "plan", moment, dueOn: null })}>
          Clear
        </ToolbarButton>
      ) : null}
      <span className="font-sans text-[12px]" style={ink3}>
        {due ? `${due.word} ${shortDay(due.on)}, counted from the drop day.` : "It shows on the Calendar once it has a day."}
      </span>
    </div>
  );
}

/** The stores, marked live as each starts serving the build. */
function StoresControl({ ctx }: { ctx: Ctx }) {
  const { drop, here, canSave, busy } = ctx;
  return (
    <ul className="space-y-1.5 border-t pt-3" style={line}>
      {STORES.map((store) => {
        const build = drop.builds[store];
        const day = build.served ?? here?.plan.stores[store];
        const walk = drop.phone?.[store];
        return (
          <li key={store} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="min-w-[12rem] flex-1 font-sans text-[12.5px]" style={ink2}>
              <span className="font-semibold" style={ink}>
                {STORE_NAME[store].replace(/^the /, "The ")}, build {build.build}.
              </span>{" "}
              {walk ? `Walked on a phone ${shortDay(walk.on)}. ` : `Not walked on a phone yet (${PHONE_WALK}). `}
              {day ? `Serving it since ${shortDay(day)}.` : "Not serving it yet."}
            </span>
            {canSave && !build.served ? (
              <ToolbarButton loading={busy === `served-${store}`} onClick={() => ctx.change(`served-${store}`, { action: "served", store, done: !day })}>
                {day ? "Take it back" : "It is live"}
              </ToolbarButton>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Records, beside the path: everything sent and kept, one tap each, and the check's line. */
function Records({
  record,
  figures,
  onOpen,
  here,
  current,
  failed,
}: {
  record: RecordId | null;
  figures: Record<RecordId, string>;
  onOpen: (id: RecordId) => void;
  here: Live | null;
  current: boolean;
  failed: boolean;
}) {
  const ids = Object.keys(RECORD_TITLE) as RecordId[];
  return (
    <div className="space-y-3">
      <section className="rounded-[var(--adm-radius)] border" style={{ ...line, background: "var(--adm-panel)" }}>
        <div className="px-3.5 pb-2 pt-3">
          <p className="font-sans text-[13px] font-semibold" style={ink}>
            Records
          </p>
          <p className="font-sans text-[12px]" style={ink3}>
            Everything sent and kept, one tap away.
          </p>
        </div>
        <ul>
          {ids.map((id) => (
            <li key={id} className="border-t" style={line}>
              <button
                type="button"
                onClick={() => onOpen(id)}
                aria-pressed={record === id}
                className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2 text-left font-sans text-[13px]"
                style={record === id ? { background: "var(--adm-panel-2)", color: "var(--adm-ink)", fontWeight: 600 } : ink2}
              >
                <span className="flex-1">{RECORD_TITLE[id]}</span>
                <span className="font-mono text-[12px]" style={ink3}>
                  {figures[id]}
                </span>
                <span aria-hidden style={ink3}>
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <CheckCard here={here} current={current} failed={failed} />
    </div>
  );
}

function CheckCard({ here, current, failed }: { here: Live | null; current: boolean; failed: boolean }) {
  const drop = CURRENT_DROP;
  const check = here && drop ? checkLine(drop, here.findings) : null;
  const findings = here ? [...here.findings].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1)) : [];
  return (
    <section className="rounded-[var(--adm-radius)] border px-3.5 py-3" style={{ ...line, background: "var(--adm-panel)" }}>
      {check ? (
        <>
          <p className="flex items-center gap-2 font-sans text-[12.5px] font-semibold" style={ink}>
            <StatusDot tone={check.passes ? "good" : "bad"} />
            {check.title}
          </p>
          <p className="mt-1 font-sans text-[12px] leading-[1.5]" style={ink3}>
            {check.line}
          </p>
          {findings.length > 0 ? (
            <details className="mt-1">
              <summary className="min-h-11 cursor-pointer font-sans text-[12px]" style={ink2}>
                What the check says
              </summary>
              <ul className="mt-1 space-y-1.5">
                {findings.map((f) => (
                  <li key={`${f.rule}-${f.where}-${f.says}`} className="font-sans text-[12px] leading-[1.5]" style={ink2}>
                    <span className="font-semibold" style={ink}>
                      {f.level === "error" ? "Refused" : "Look"}: {f.where}
                    </span>{" "}
                    {f.says}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : (
        <p className="font-sans text-[12px]" style={ink3}>
          {current ? (failed ? "The check did not load." : "Reading the check.") : "The check runs on the current release."}
        </p>
      )}
    </section>
  );
}

/** One record, in place of the path. */
function RecordView({ ctx, id, notes }: { ctx: Ctx; id: RecordId; notes: PatchNotes }) {
  switch (id) {
    case "notes":
      return <NotesRecord notes={notes} />;
    case "board":
      return notes.data ? (
        <BoardMessageCard
          rows={notes.data.board}
          fromFallback={notes.data.boardFromFallback}
          tableAbsent={notes.data.boardTableAbsent}
          busy={notes.busy}
          post={notes.post}
        />
      ) : (
        <p className={SMALL} style={ink3}>
          Reading the board.
        </p>
      );
    case "push":
      return <PushRecord />;
    case "going":
      return <EmailRecord part="going" />;
    case "people":
      return <EmailRecord part="people" />;
    case "next":
      return <ComingNext live={ctx.here} canSave={ctx.canSave} busy={ctx.busy} change={ctx.change} />;
    case "words":
      return <ReleaseWords ctx={ctx} />;
  }
}

/** What the release is, said once and used in every piece; its cards; what may not be said; its links. */
function ReleaseWords({ ctx }: { ctx: Ctx }) {
  const { drop } = ctx;
  const whole = ctx.here?.whole ?? "";
  const cards = DROP_CARDS[drop.release] ?? [];
  const captions = drop.pieces.filter((p) => p.channel === "instagram" || p.channel === "tiktok" || p.channel === "youtube");
  const h = "mb-1.5 font-sans text-[12.5px] font-semibold";
  return (
    <div className="space-y-5">
      <section>
        <p className={h} style={ink}>
          What the release is, each point tied to a line of a note
        </p>
        <ul>
          {drop.points.map((pt) => (
            <li key={pt.id} className="flex gap-3 border-t py-2.5 first:border-t-0 first:pt-0" style={line}>
              <Mark className="text-[15px] leading-6">{pt.emoji}</Mark>
              <div className="min-w-0">
                <p className="font-sans text-[13px] font-semibold" style={ink}>
                  {pt.name} {pt.needs === "apps" ? <Pill>In the apps only</Pill> : null}
                </p>
                <p className={SMALL} style={ink2}>
                  {pt.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {drop.also.length ? (
          <ul className={`mt-2 list-disc space-y-0.5 pl-5 ${SMALL}`} style={ink2}>
            {drop.also.map((a) => (
              <li key={a.text}>{a.text}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {cards.length ? (
        <section>
          <p className={h} style={ink}>
            The cards
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((card) => (
              <li key={card.file} className="space-y-1.5">
                {/* Already small (540 wide), so they are served as they are. */}
                <Image src={card.src} alt={`The ${card.label} card`} unoptimized className="h-auto w-full rounded-[var(--adm-radius-sm)] border" style={line} />
                <p className="font-sans text-[11.5px]" style={ink3}>
                  {card.label}
                </p>
              </li>
            ))}
          </ul>
          {captions.length ? (
            <ul className="mt-3">
              {captions.map((piece) => (
                <li key={piece.id} className="space-y-2 border-t py-3" style={line}>
                  <p className="font-sans text-[12.5px] font-semibold" style={ink}>
                    {piece.title}
                  </p>
                  <p className={`${SMALL} whitespace-pre-wrap`} style={ink2}>
                    {piece.text}
                  </p>
                  {piece.text ? <CopyButton ctx={ctx} id={`c-${piece.id}`} text={piece.text} label="Copy caption" /> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section>
        <p className={h} style={ink}>
          What may not be said yet
        </p>
        <ul className={`space-y-1 ${SMALL}`} style={ink2}>
          {drop.never.map((n) => (
            <li key={n.word}>
              <span className="font-semibold" style={ink}>
                {n.word}
              </span>
              : {n.why}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className={h} style={ink}>
          Links, tags and figures
        </p>
        <ul className={`space-y-2 ${SMALL}`} style={ink2}>
          {(
            [
              ["What's New", drop.links.whatsNew],
              ["App Store", drop.links.appStore],
              ["Google Play", drop.links.play],
              ["Hashtags", drop.hashtags.join(" ")],
            ] as const
          ).map(([label, value]) => (
            <li key={label} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[6rem] font-semibold" style={ink}>
                {label}
              </span>
              <span className="min-w-0 flex-1 break-all">{value}</span>
              <CopyButton ctx={ctx} id={`l-${label}`} text={value} label="Copy" />
            </li>
          ))}
          <li>
            <span className="font-semibold" style={ink}>
              Figures a caption may carry
            </span>
            : {drop.figures.map((f) => f.figure).join(", ")}
          </li>
        </ul>
      </section>

      {whole ? (
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <p className={`${h} flex-1`} style={ink}>
              Everything in {drop.release}, in one note
            </p>
            <CopyButton ctx={ctx} id="whole" text={whole} label="Copy all of it" />
          </div>
          <details>
            <summary className="min-h-11 cursor-pointer font-sans text-[12px]" style={ink2}>
              Read it
            </summary>
            <p className="mt-2 whitespace-pre-wrap break-words font-sans text-[12.5px] leading-[1.6]" style={ink2}>
              {whole}
            </p>
          </details>
        </section>
      ) : null}
    </div>
  );
}

/** Updates still to come: a version, what it is for, and the day it is meant for. They show on the Calendar. */
function ComingNext({
  live,
  canSave,
  busy,
  change,
}: {
  live: Live | null;
  canSave: boolean;
  busy: string | null;
  change: (key: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState("");
  const valid = /^\d+\.\d+(\.\d+)?$/.test(version.trim()) && Boolean(dueOn);

  async function add() {
    await change("update-new", { action: "update", version: version.trim(), title: title.trim() || undefined, dueOn });
    setVersion("");
    setTitle("");
    setDueOn("");
  }

  return (
    <div className="space-y-3">
      <p className={SMALL} style={ink3}>
        Updates you are planning, each with its day. They sit on the Calendar as an update, and get a drop of their own once
        their note is written.
      </p>
      {live?.plan.upcoming.length ? (
        <ul>
          {live.plan.upcoming.map((u) => (
            <li key={u.version} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t py-3 first:border-t-0 first:pt-0" style={line}>
              <div className="min-w-[12rem] flex-1">
                <p className="font-sans text-[13px] font-semibold" style={ink}>
                  {u.title}
                </p>
                <p className="font-sans text-[11.5px]" style={ink3}>
                  {u.version}, {shortDay(u.dueOn)}
                  {u.notes ? `. ${u.notes}` : ""}
                </p>
              </div>
              <Pill tone={u.done ? "emerald" : u.dueOn < live.today ? "rose" : "neutral"}>{u.done ? "Shipped" : u.dueOn < live.today ? "Past its day" : "Planned"}</Pill>
              {canSave ? (
                <>
                  <ToolbarButton
                    loading={busy === `update-${u.version}`}
                    onClick={() => change(`update-${u.version}`, { action: "update", version: u.version, title: u.title, notes: u.notes ?? undefined, dueOn: u.dueOn, done: !u.done })}
                  >
                    {u.done ? "Not shipped yet" : "Shipped"}
                  </ToolbarButton>
                  <ToolbarButton variant="danger" loading={busy === `remove-${u.version}`} onClick={() => change(`remove-${u.version}`, { action: "update", version: u.version, dueOn: null })}>
                    Remove
                  </ToolbarButton>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={SMALL} style={ink3}>
          Nothing planned yet.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t pt-4" style={line}>
        <label className="flex flex-col gap-1 font-sans text-[11.5px]" style={ink3}>
          Version
          <input className={`${FIELD} w-24`} style={field} placeholder="1.9" value={version} onChange={(e) => setVersion(e.target.value)} />
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 font-sans text-[11.5px]" style={ink3}>
          What it is for
          <input className={FIELD} style={field} placeholder="November saints, and their cards" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 font-sans text-[11.5px]" style={ink3}>
          Day
          <input type="date" className={FIELD} style={field} value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
        </label>
        {canSave && valid ? (
          <ToolbarButton variant="primary" loading={busy === "update-new"} onClick={add}>
            Plan it
          </ToolbarButton>
        ) : (
          <span className="pb-2 font-sans text-[11.5px]" style={ink3}>
            {canSave ? "A version like 1.9, and a day." : "Saving is off until the live state loads."}
          </span>
        )}
      </div>
    </div>
  );
}
