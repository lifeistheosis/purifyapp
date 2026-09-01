"use client";

import { useState } from "react";

import { Card, DataTable, Pill, StatCard, ToolbarButton, Email } from "../primitives";
import { patchJson, shortDate, useAdminFetch } from "../adminFetch";

/**
 * The verification queue, and the toggle that decides it.
 *
 * Anyone may ask; only an admin may grant. Every write goes through
 * /api/admin/verification behind getAdminUser() and the service role, because
 * public.user_verification has insert, update and delete revoked from anon and
 * authenticated. The one thing that must be impossible is granting yourself a
 * badge.
 *
 * The queue is ordered OLDEST REQUEST FIRST rather than newest, so a person
 * who asked three weeks ago is not pushed down the screen forever by people
 * who asked this morning. A queue sorted newest-first quietly stops being a
 * queue.
 */

type VerificationRow = {
  user_id: string;
  status: "requested" | "verified" | "declined";
  claim: string | null;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  note: string | null;
  /** From GoTrue, not profiles: profiles has no email column and never had. */
  email: string | null;
};

const STATUS_TONE: Record<VerificationRow["status"], "gold" | "emerald" | "neutral"> = {
  requested: "gold",
  verified: "emerald",
  declined: "neutral",
};

export function VerificationTab() {
  const { data, error, reload } = useAdminFetch<{ requests: VerificationRow[] }>(
    "/api/admin/verification",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const rows = data?.requests ?? [];
  const waiting = rows.filter((r) => r.status === "requested");
  const verified = rows.filter((r) => r.status === "verified");

  async function decide(
    userId: string,
    next: VerificationRow["status"],
  ): Promise<void> {
    setBusy(userId);
    setStatus(null);
    const err = await patchJson("/api/admin/verification", {
      userId,
      status: next,
    });
    setBusy(null);
    if (err) setStatus(err);
    else reload();
  }

  /**
   * Verify, or unverify, an account that never asked.
   *
   * The queue is a queue of REQUESTS, so before this the only way to grant a
   * badge was to wait for someone to apply for one. Verifying a person the
   * admin already knows is the ordinary case and had no path at all.
   *
   * The email is resolved to a uuid on the server. Nothing here learns an auth
   * id, which is deliberate: serving those to clients is the hole
   * 20260802_revoke_public_user_id.sql closed.
   */
  async function decideByEmail(next: VerificationRow["status"]): Promise<void> {
    const target = email.trim();
    if (!target) return;
    setBusy("by-email");
    setStatus(null);
    setNote(null);
    const err = await patchJson("/api/admin/verification", {
      email: target,
      status: next,
    });
    setBusy(null);
    if (err) {
      setStatus(err);
      return;
    }
    // Named, and it says which address, because the input is about to be
    // cleared and "Saved." next to an empty box does not tell an admin whether
    // they verified the person they meant to.
    setNote(
      next === "verified"
        ? `Verified ${target}.`
        : `Removed the badge from ${target}.`,
    );
    setEmail("");
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Awaiting a decision" value={waiting.length} accent />
        <StatCard label="Verified" value={verified.length} />
        <StatCard
          label="Declined"
          value={rows.filter((r) => r.status === "declined").length}
        />
        <StatCard label="Requests, all time" value={rows.length} />
      </div>

      {(error ?? status) && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error ?? status}
        </p>
      )}

      <Card
        title="Verify an account directly"
        subtitle="For someone you already know. They do not need to have asked"
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1">
            <span
              className="mb-1 block font-sans text-[11.5px]"
              style={{ color: "var(--adm-ink-3)" }}
            >
              Account email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // Enter submits. An admin typing an address and pressing return
              // expects it to go; making them reach for the mouse is the kind
              // of friction that gets a screen called broken.
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim() && !busy) {
                  e.preventDefault();
                  void decideByEmail("verified");
                }
              }}
              placeholder="someone@example.com"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[13px] outline-none"
              style={{
                background: "var(--adm-control)",
                borderColor: "var(--adm-line)",
                color: "var(--adm-ink)",
              }}
            />
          </label>
          <ToolbarButton
            variant="primary"
            loading={busy === "by-email"}
            title="Grant the blue check to this address"
            onClick={() => void decideByEmail("verified")}
          >
            Verify
          </ToolbarButton>
          <ToolbarButton
            variant="danger"
            loading={busy === "by-email"}
            title="Take the badge back from this address"
            onClick={() => void decideByEmail("declined")}
          >
            Unverify
          </ToolbarButton>
        </div>
        {note && (
          <p
            role="status"
            className="mt-2 font-sans text-[12.5px]"
            style={{ color: "var(--adm-positive, #34d399)" }}
          >
            {note}
          </p>
        )}
      </Card>

      <Card
        title="Verification"
        subtitle="Anyone can ask. Only this page grants it, and every decision records who made it"
      >
        <DataTable<VerificationRow>
          csvFilename="verification-requests.csv"
          columns={[
            {
              key: "who",
              label: "Account",
              render: (r) =>
                r.email ? (
                  <Email value={r.email} className="text-paper/85" />
                ) : (
                  <Pill tone="rose">no account</Pill>
                ),
              csv: (r) => r.email ?? "",
            },
            {
              key: "claim",
              label: "What they said",
              render: (r) => (
                <span className="text-paper/70">{r.claim?.trim() || "—"}</span>
              ),
              csv: (r) => r.claim ?? "",
            },
            {
              key: "asked",
              label: "Asked",
              render: (r) => shortDate(r.requested_at),
              csv: (r) => r.requested_at,
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>,
              csv: (r) => r.status,
            },
            {
              key: "decided",
              label: "Decided by",
              render: (r) => (
                <span className="whitespace-nowrap text-paper/60">
                  {r.decided_by ?? ""}
                  {r.decided_at ? ` · ${shortDate(r.decided_at)}` : ""}
                </span>
              ),
              csv: (r) => r.decided_by ?? "",
            },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex justify-end gap-1.5">
                  {r.status !== "verified" && (
                    <ToolbarButton
                      variant="primary"
                      loading={busy === r.user_id}
                      title="Grant the blue check"
                      onClick={() => void decide(r.user_id, "verified")}
                    >
                      Verify
                    </ToolbarButton>
                  )}
                  {r.status === "verified" && (
                    <ToolbarButton
                      variant="danger"
                      loading={busy === r.user_id}
                      title="Take the badge back"
                      onClick={() => void decide(r.user_id, "declined")}
                    >
                      Unverify
                    </ToolbarButton>
                  )}
                  {r.status === "requested" && (
                    <ToolbarButton
                      loading={busy === r.user_id}
                      onClick={() => void decide(r.user_id, "declined")}
                    >
                      Decline
                    </ToolbarButton>
                  )}
                </div>
              ),
            },
          ]}
          rows={rows}
          rowKey={(r) => r.user_id}
          empty="Nobody has asked to be verified yet."
        />
      </Card>
    </div>
  );
}
