"use client";

import { useState } from "react";

import type { ChantWordsPayload, ChantWordsVersion } from "@/app/api/admin/chant-words/route";
import { patchJson, useAdminFetch } from "../adminFetch";
import { Card, Disclosure, Pill, Skeleton, ToolbarButton } from "../primitives";

/**
 * Chant words as sung, switched on when their clearance comes (build 86 note
 * 78). The owner, 2026-10-31: "then make the system and add a button to the
 * back end so I can switch it on when I receive clearance".
 *
 * Drawn under its one line on the Content desk (components/admin/tabs/
 * ContentTab.tsx; #tab=chant-words opens it). One card a chant version:
 * which words it shows (the public-domain wording
 * it carries, or the words as sung, cleared), the clearance kept beside them
 * (who said yes, when, their reply), and the switch. The words and their
 * timing are entered here when the clearance comes, never before: the
 * repository is public. Switched on, every app shows them within minutes,
 * with no new build; switched off, the public-domain wording is back.
 * Writes go through /api/admin/chant-words (lib/chants/clearedInput.ts says
 * what it takes).
 */

const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;
const fieldCls = "w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]";
const fieldStyle = { background: "var(--adm-control)", borderColor: "var(--adm-line-strong)", color: "var(--adm-ink)" } as React.CSSProperties;
const labelCls = "mb-1 block font-sans text-[11.5px]";

const API = "/api/admin/chant-words";

export function ChantWordsDetail() {
  const { data, error, reload } = useAdminFetch<ChantWordsPayload>(API);
  if (error) return <p className="font-sans text-[12.5px]" style={ink2}>{error}</p>;
  if (!data) return <Skeleton h={160} />;
  return (
    <div className="space-y-4">
      <p className="max-w-[72ch] font-sans text-[12.5px] leading-[1.55]" style={ink2}>
        Where a choir sings words still under copyright, a version shows the nearest public-domain wording. When the
        rights holder says yes, enter their words and the clearance here, save, then switch the version to the words as
        sung. Every app shows them within minutes, with no new build. Switch back and the public-domain wording returns.
      </p>
      {data.tableAbsent ? (
        <p className="font-sans text-[12px]" style={ink3}>
          The table is not there yet: supabase/migrations/20261101000000_chant_cleared_words.sql waits on your OK. Nothing
          can be saved until it is merged.
        </p>
      ) : null}
      {data.versions.map((v) => (
        <VersionCard key={`${v.slug}/${v.variant}`} v={v} onChanged={reload} locked={data.tableAbsent} />
      ))}
    </div>
  );
}

function VersionCard({ v, onChanged, locked }: { v: ChantWordsVersion; onChanged: () => void; locked: boolean }) {
  const row = v.row;
  const on = Boolean(row?.enabled);
  const complete = Boolean(row && row.cleared_by && row.cleared_on && row.clearance_reply && row.words_source && row.lines.length && row.timing);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    const err = await patchJson(API, { slug: v.slug, variant: v.variant, ...body }, "POST");
    setBusy(false);
    if (err) setMessage(err);
    else onChanged();
  }

  return (
    <Card
      title={`${v.title}, ${v.label}`}
      subtitle={
        <span>
          {v.performer ? `Sung by ${v.performer}. ` : ""}
          {v.lines} lines{v.nearest ? `, ${v.nearest} of them the nearest public-domain wording` : ""}.
        </span>
      }
      action={<Pill tone={on ? "emerald" : "neutral"}>{on ? "Words as sung, cleared" : "Public-domain wording"}</Pill>}
    >
      <div className="space-y-3">
        <div role="group" aria-label={`Words shown for ${v.title}, ${v.label}`} className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-sans text-[12px]" style={ink3}>
            Words shown
          </span>
          <ToolbarButton variant={on ? "default" : "chosen"} loading={busy} onClick={() => (on ? act({ action: "switch", on: false }) : undefined)}>
            Public-domain wording
          </ToolbarButton>
          <ToolbarButton
            variant={on ? "chosen" : "default"}
            loading={busy}
            title={complete ? undefined : "Enter and save the cleared words and their clearance first"}
            onClick={() => (!on && complete && !locked ? act({ action: "switch", on: true }) : setMessage(complete ? null : "Enter and save the cleared words and their clearance first."))}
          >
            Words as sung, cleared
          </ToolbarButton>
        </div>

        {row ? (
          <dl className="grid gap-x-6 gap-y-1.5 font-sans text-[12.5px] md:grid-cols-[10rem_1fr]" style={ink2}>
            <dt style={ink3}>Who said yes</dt>
            <dd>{row.cleared_by ?? "not recorded"}</dd>
            <dt style={ink3}>When</dt>
            <dd>{row.cleared_on ?? "not recorded"}</dd>
            <dt style={ink3}>Their reply</dt>
            <dd className="whitespace-pre-wrap">{row.clearance_reply ?? "not recorded"}</dd>
            <dt style={ink3}>Words</dt>
            <dd>
              {row.lines.length} lines, {row.timing ? "timed" : "not timed"}
              {row.enabled_at ? `, on since ${row.enabled_at.slice(0, 10)}` : ""}
            </dd>
          </dl>
        ) : (
          <p className="font-sans text-[12px]" style={ink3}>
            No clearance yet. The words carried: {v.wordsSource}
          </p>
        )}

        <Disclosure title={row ? "Change the cleared words" : "Enter the cleared words"} hint="when the clearance comes">
          <ClearedForm v={v} busy={busy} locked={locked} onSave={(body) => act({ action: "save", ...body })} />
        </Disclosure>

        {row && !on ? (
          <ToolbarButton variant="danger" loading={busy} onClick={() => act({ action: "delete" })}>
            Delete these cleared words
          </ToolbarButton>
        ) : null}
        {message ? (
          <p role="status" className="font-sans text-[12px]" style={ink2}>
            {message}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * The words as sung (a line to a line, as the version's own lines are, or a
 * JSON list of lines with their transliteration and English), their word
 * timing (the version 2 file scripts/chants/time-words.mjs writes with
 * --words and --out), where they come from, and the clearance.
 */
function ClearedForm({
  v,
  busy,
  locked,
  onSave,
}: {
  v: ChantWordsVersion;
  busy: boolean;
  locked: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const row = v.row;
  const [words, setWords] = useState(() => (row ? row.lines.map((l) => l.text).join("\n") : ""));
  const [timing, setTiming] = useState(() => (row?.timing ? JSON.stringify(row.timing) : ""));
  const [source, setSource] = useState(row?.words_source ?? "");
  const [by, setBy] = useState(row?.cleared_by ?? "");
  const [on, setOn] = useState(row?.cleared_on ?? "");
  const [reply, setReply] = useState(row?.clearance_reply ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  function save() {
    setProblem(null);
    let lines: unknown;
    const trimmed = words.trim();
    if (trimmed.startsWith("[")) {
      try {
        lines = JSON.parse(trimmed);
      } catch {
        setProblem("The words start with [ but are not a JSON list of lines.");
        return;
      }
    } else {
      // Keep each line's transliteration and English where the new words keep its text.
      lines = trimmed
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => {
          const was = row?.lines.find((l) => l.text === text);
          return was ? { ...was, text } : { text };
        });
    }
    let parsedTiming: unknown;
    try {
      parsedTiming = JSON.parse(timing);
    } catch {
      setProblem("The timing is not JSON: paste the file scripts/chants/time-words.mjs wrote.");
      return;
    }
    onSave({ lines, timing: parsedTiming, wordsSource: source, clearedBy: by, clearedOn: on, reply });
  }

  return (
    <div className="space-y-3 p-3">
      <p className="font-sans text-[12px] leading-[1.55]" style={ink3}>
        The version carries {v.carried.length} lines; the cleared words follow the singing line for line. Time them
        against the recording first: node scripts/chants/time-words.mjs {v.slug} {v.variant} --wav (the recording, 16 kHz
        mono) --words (the words as a JSON list) --out (a file), then paste that file below.
      </p>
      <label className="block">
        <span className={labelCls} style={ink3}>
          The words as sung, a line to a line
        </span>
        <textarea className={`${fieldCls} py-2 leading-[1.6]`} style={fieldStyle} rows={8} value={words} onChange={(e) => setWords(e.target.value)} />
      </label>
      <label className="block">
        <span className={labelCls} style={ink3}>
          Their word timing (JSON)
        </span>
        <textarea className={`${fieldCls} py-2 font-mono text-[11.5px]`} style={fieldStyle} rows={4} value={timing} onChange={(e) => setTiming(e.target.value)} />
      </label>
      <label className="block">
        <span className={labelCls} style={ink3}>
          Where the words come from, as readers will see it under them
        </span>
        <textarea className={`${fieldCls} py-2`} style={fieldStyle} rows={2} value={source} onChange={(e) => setSource(e.target.value)} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className={labelCls} style={ink3}>
            Who said yes
          </span>
          <input className={`${fieldCls} h-10`} style={fieldStyle} value={by} onChange={(e) => setBy(e.target.value)} />
        </label>
        <label className="block">
          <span className={labelCls} style={ink3}>
            When
          </span>
          <input className={`${fieldCls} h-10 tabular-nums`} style={fieldStyle} type="date" value={on} onChange={(e) => setOn(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className={labelCls} style={ink3}>
          Their reply, as it came
        </span>
        <textarea className={`${fieldCls} py-2`} style={fieldStyle} rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
      </label>
      <div className="flex items-center gap-2">
        <ToolbarButton variant="primary" loading={busy} onClick={() => (locked ? setProblem("The table is not there yet.") : save())}>
          Save
        </ToolbarButton>
        <span className="font-sans text-[11.5px]" style={ink3}>
          Saving does not switch anything on.
        </span>
      </div>
      {problem ? (
        <p role="status" className="font-sans text-[12px]" style={ink2}>
          {problem}
        </p>
      ) : null}
    </div>
  );
}
