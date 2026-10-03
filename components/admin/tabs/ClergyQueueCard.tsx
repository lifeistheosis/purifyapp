"use client";

import { useState } from "react";

import { Card, Email, Pill, ToolbarButton } from "../primitives";
import { patchJson, shortDate, useAdminFetch } from "../adminFetch";

/**
 * Verified clergy (app/api/admin/clergy, 20261005): who asked for the seal,
 * what they said about themselves and how to check it, and the decision.
 *
 * Check before verifying: the parish or diocese page they named, or a call
 * to the parish. The seal stands beside their name on every post and reply
 * from the moment it is granted, and Ask a Priest marks their answers, so it
 * is the one decision on this page a reader cannot see the team reverse
 * without noticing. A decline can carry a note back to them.
 */

type Rank = "bishop" | "priest" | "deacon" | "monastic";

type ClergyRow = {
  user_id: string;
  status: "requested" | "verified" | "declined";
  rank: Rank | null;
  jurisdiction: string | null;
  parish: string | null;
  evidence: string | null;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  note: string | null;
  email: string | null;
  handle: string | null;
};

const RANKS: Rank[] = ["bishop", "priest", "deacon", "monastic"];
const RANK_LABEL: Record<Rank, string> = { bishop: "Bishop", priest: "Priest", deacon: "Deacon", monastic: "Monastic" };
const TONE = { requested: "gold", verified: "emerald", declined: "neutral" } as const;

const inputStyle = { background: "var(--adm-control)", borderColor: "var(--adm-line)", color: "var(--adm-ink)" };

export function ClergyQueueCard() {
  const { data, error, reload } = useAdminFetch<{ live: boolean; requests: ClergyRow[] }>("/api/admin/clergy");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Record<string, Rank>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [emailRank, setEmailRank] = useState<Rank>("priest");

  const rows = data?.requests ?? [];
  const waiting = rows.filter((r) => r.status === "requested");

  async function decide(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setStatus(null);
    const err = await patchJson("/api/admin/clergy", body);
    setBusy(null);
    if (err) setStatus(err);
    else reload();
  }

  if (data && !data.live) {
    return (
      <Card title="Verified clergy">
        <p className="font-sans text-detail text-paper/50">The clergy seal switches on with 20261005000000_community_three.sql.</p>
      </Card>
    );
  }

  return (
    <Card
      title="Verified clergy"
      subtitle="Bishops, priests, deacons and monastics. Check the parish or diocese they name before you verify"
      accent={waiting.length > 0}
    >
      {(error ?? status) && (
        <p role="alert" className="mb-3 font-sans text-detail text-[color:var(--adm-critical)]">
          {error ?? status}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Verify someone directly, by account email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="father@parish.org"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[13px] outline-none"
            style={inputStyle}
          />
        </label>
        <select
          value={emailRank}
          onChange={(e) => setEmailRank(e.target.value as Rank)}
          className="rounded-[var(--adm-radius-sm)] border px-2 py-2 font-sans text-[13px]"
          style={inputStyle}
          aria-label="Rank"
        >
          {RANKS.map((r) => (
            <option key={r} value={r}>
              {RANK_LABEL[r]}
            </option>
          ))}
        </select>
        <ToolbarButton
          variant="primary"
          loading={busy === "by-email"}
          onClick={() => {
            if (!email.trim()) return;
            void decide({ email: email.trim(), status: "verified", rank: emailRank }, "by-email").then(() => setEmail(""));
          }}
        >
          Verify
        </ToolbarButton>
      </div>

      {rows.length === 0 ? (
        <p className="font-sans text-detail text-paper/45">Nobody has asked for the clergy seal yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const rank = ranks[r.user_id] ?? r.rank ?? "priest";
            return (
              <li key={r.user_id} className="rounded-[var(--adm-radius)] border border-paper/10 bg-paper/[0.02] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={TONE[r.status]}>{r.status}</Pill>
                  {r.rank ? <Pill tone="neutral">{RANK_LABEL[r.rank]}</Pill> : null}
                  {r.email ? <Email value={r.email} className="text-paper/85" /> : <Pill tone="rose">no account</Pill>}
                  {r.handle ? <span className="font-sans text-caption text-paper/55">@{r.handle}</span> : null}
                  <span className="font-sans text-caption text-paper/45">asked {shortDate(r.requested_at)}</span>
                </div>
                <dl className="mt-2 grid gap-1 font-sans text-detail text-paper/75 sm:grid-cols-2">
                  <div>
                    <dt className="text-paper/45">Jurisdiction</dt>
                    <dd>{r.jurisdiction || "Not given"}</dd>
                  </div>
                  <div>
                    <dt className="text-paper/45">Parish or monastery</dt>
                    <dd>{r.parish || "Not given"}</dd>
                  </div>
                </dl>
                {r.evidence ? (
                  <p className="mt-2 whitespace-pre-wrap break-words rounded-md border border-paper/10 bg-black/20 p-2 font-sans text-detail text-paper/80">
                    {r.evidence}
                  </p>
                ) : null}
                {r.decided_by ? (
                  <p className="mt-1 font-sans text-caption text-paper/45">
                    Decided by {r.decided_by}
                    {r.decided_at ? `, ${shortDate(r.decided_at)}` : ""}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={rank}
                    onChange={(e) => setRanks((m) => ({ ...m, [r.user_id]: e.target.value as Rank }))}
                    className="rounded-[var(--adm-radius-sm)] border px-2 py-1.5 font-sans text-[13px]"
                    style={inputStyle}
                    aria-label="Rank"
                  >
                    {RANKS.map((x) => (
                      <option key={x} value={x}>
                        {RANK_LABEL[x]}
                      </option>
                    ))}
                  </select>
                  {r.status !== "verified" ? (
                    <ToolbarButton
                      variant="primary"
                      loading={busy === r.user_id}
                      onClick={() => void decide({ userId: r.user_id, status: "verified", rank }, r.user_id)}
                    >
                      Verify
                    </ToolbarButton>
                  ) : (
                    <ToolbarButton loading={busy === r.user_id} onClick={() => void decide({ userId: r.user_id, status: "verified", rank }, r.user_id)}>
                      Save rank
                    </ToolbarButton>
                  )}
                  <input
                    value={notes[r.user_id] ?? ""}
                    onChange={(e) => setNotes((m) => ({ ...m, [r.user_id]: e.target.value }))}
                    placeholder="Note to them, if declining"
                    maxLength={500}
                    className="min-w-[12rem] flex-1 rounded-[var(--adm-radius-sm)] border px-3 py-1.5 font-sans text-[13px] outline-none"
                    style={inputStyle}
                  />
                  <ToolbarButton
                    variant="danger"
                    loading={busy === r.user_id}
                    onClick={() => void decide({ userId: r.user_id, status: "declined", note: notes[r.user_id]?.trim() || null }, r.user_id)}
                  >
                    {r.status === "verified" ? "Take the seal back" : "Decline"}
                  </ToolbarButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
