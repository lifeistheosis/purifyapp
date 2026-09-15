"use client";

// Email: the account mail Purify sends, and the two jobs an owner runs by hand.
//
// Two cards today, and the funnel's later sends land here as they are built:
//   1. Daily account email. What the lifecycle job sends, and Run now, which
//      calls the same code the cron route does. Safe to press twice: every
//      email is keyed and goes once, and the report shows duplicates.
//   2. Terms change notice. The exact email, who it reaches, how many already
//      have it, and a Send that asks first.

import { useCallback, useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import type { LifecycleReport } from "@/lib/email/lifecycle";
import { Card, Modal, Pill, ToolbarButton } from "../primitives";
import { CampaignCard } from "../email/CampaignCard";

type TermsPreview = {
  version: string;
  effective: string;
  subject: string;
  text: string;
  accounts: number | null;
  complete: boolean;
  audienceError: string | null;
  alreadySent: number | null;
};

type TermsResult = {
  version: string;
  accounts: number;
  sent: number;
  skipped: number;
  failed: number;
  duplicate: number;
  unavailable: number;
};

const KIND_LABEL: Record<keyof LifecycleReport["byKind"], string> = {
  plus_ending: "Plus ends in three days",
  plus_ended: "Plus has ended",
  winback: "A month on (winback)",
  claim_closing: "EIKON claims close soon",
  welcome: "Welcome (catch-up)",
  order_address: "Order needs an address",
};

const COUNT_COLUMNS = [
  "sent",
  "duplicate",
  "skipped",
  "failed",
  "unavailable",
  "no_address",
  "held",
  "not_opted_in",
] as const;

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

async function post<T>(url: string, body?: unknown): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!r.ok && r.status !== 207) return { ok: false, data: null, error: data?.error ?? `Request failed (${r.status})` };
    return { ok: true, data, error: null };
  } catch (e) {
    return { ok: false, data: null, error: (e as Error).message };
  }
}

export function EmailTab() {
  return (
    <div className="space-y-5">
      <LifecycleCard />
      <CampaignCard />
      <TermsCard />
    </div>
  );
}

function LifecycleCard() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<LifecycleReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const r = await post<LifecycleReport>("/api/admin/email/lifecycle");
    setBusy(false);
    if (!r.ok) setError(r.error);
    else setReport(r.data);
  }

  return (
    <Card
      title="Daily account email"
      subtitle="Sent from the dates on each membership. Press Run now any time; nothing goes twice."
      action={
        <ToolbarButton variant="primary" loading={busy} onClick={run}>
          Run now
        </ToolbarButton>
      }
    >
      <ul className="space-y-1.5 font-sans text-[12.5px] leading-[1.55]" style={ink2}>
        <li>
          <span style={ink}>Plus ends in three days.</span> Only to members who turned renewal off, never to
          someone renewing, and not to anyone who already had the payment email this month.
        </li>
        <li>
          <span style={ink}>Plus has ended.</span> Within two days of the membership ending.
        </li>
        <li>
          <span style={ink}>A month on.</span>{" "}
          Once in a member&apos;s life, thirty days after it ended, and only to those who turned on the library
          list, because it is a come-back email. Held until EMAIL_POSTAL_ADDRESS is set. Mentions the EIKON Box
          only to those who had Pro.
        </li>
        <li>
          <span style={ink}>EIKON claims close soon.</span> In the last 48 hours of an open drop, to Pro members who
          have not claimed.
        </li>
      </ul>
      <ul className="mt-1.5 space-y-1.5 font-sans text-[12.5px] leading-[1.55]" style={ink2}>
        <li>
          <span style={ink}>Welcome, catch-up.</span> Any account under seven days old that did not get its welcome
          at sign-up. Password sign-ups without email confirmation can miss it; this is where they get it.
        </li>
        <li>
          <span style={ink}>Order needs an address.</span> A paid shop order with no address, a day in, and a
          reminder from day four. Checkout collects addresses, so this should rarely fire. Replies come to the shop
          inbox.
        </li>
      </ul>
      <p className="mt-2 font-sans text-[11.5px]" style={ink3}>
        Payment failed, membership active and account deleted are not here: they go out the moment their event
        happens. Welcome usually does too, at sign-in on the web or in the app.
      </p>

      {error && (
        <p role="alert" className="mt-3 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          {error}
        </p>
      )}

      {report && (
        <div className="mt-4 space-y-2">
          <p className="font-sans text-[12.5px]" style={ink2}>
            Ran {new Date(report.ranAt).toLocaleString()}. {report.planned} email
            {report.planned === 1 ? "" : "s"} due.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-[12px] tabular-nums">
              <thead>
                <tr style={ink3}>
                  <th className="py-1 pr-3 text-left font-medium">Email</th>
                  {COUNT_COLUMNS.map((c) => (
                    <th key={c} className="py-1 px-2 text-right font-medium">
                      {c.replace("_", " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(KIND_LABEL) as (keyof LifecycleReport["byKind"])[]).map((k) => (
                  <tr key={k} className="border-t" style={{ borderColor: "var(--adm-line)" }}>
                    <td className="py-1.5 pr-3" style={ink}>
                      {KIND_LABEL[k]}
                    </td>
                    {COUNT_COLUMNS.map((c) => (
                      <td key={c} className="py-1.5 px-2 text-right" style={report.byKind[k][c] ? ink : ink3}>
                        {report.byKind[k][c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!report.renewalStateKnown && (
            <p className="font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
              Renewal state could not be read, so &ldquo;Plus ends in three days&rdquo; was held back. Apply
              supabase/migrations/20260914_email_sends.sql.
            </p>
          )}
          {Object.values(report.byKind).some((counts) => counts.unavailable > 0) && (
            <p className="font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
              Unavailable means email_sends is not applied, so nothing could be sent exactly once, and nothing
              was sent.
            </p>
          )}
          {report.errors.length > 0 && (
            <ul className="font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
              {report.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function TermsCard() {
  const [preview, setPreview] = useState<TermsPreview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TermsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = await adminJson<TermsPreview>("/api/admin/email/terms");
    setPreview(p);
    setLoadError(p === null);
  }, []);

  useEffect(() => {
    let alive = true;
    adminJson<TermsPreview>("/api/admin/email/terms").then((p) => {
      if (!alive) return;
      setPreview(p);
      setLoadError(p === null);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function send() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    const r = await post<TermsResult>("/api/admin/email/terms", { confirm: true, version: preview.version });
    setBusy(false);
    setConfirming(false);
    if (!r.ok) setError(r.error);
    else setResult(r.data);
    void load();
  }

  const ledgerMissing = preview?.alreadySent === null;
  const canSend = !!preview && !ledgerMissing && preview.complete && (preview.accounts ?? 0) > 0;

  return (
    <Card
      title="Terms change notice"
      subtitle="Goes to every account, whatever their email preferences, once per terms version."
      action={
        // No preview, no button: the dialog it opens is built from the
        // preview, and a button that opens nothing reads as broken.
        preview ? (
          <ToolbarButton
            variant="primary"
            onClick={() => setConfirming(true)}
            title={canSend ? undefined : "See the note below"}
          >
            {preview.accounts ? `Send to ${preview.accounts} accounts` : "Send"}
          </ToolbarButton>
        ) : undefined
      }
    >
      {loadError && (
        <p className="font-sans text-[12.5px]" style={ink3}>
          The preview did not load. This needs a signed-in admin session.
        </p>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 font-sans text-[12.5px]" style={ink2}>
            <Pill>Terms {preview.version}</Pill>
            <span>Effective {preview.effective}</span>
            <span style={ink3}>·</span>
            <span>
              {preview.alreadySent === null
                ? "Send log not applied"
                : `${preview.alreadySent} already sent for this version`}
            </span>
          </div>

          <div className="rounded-[var(--adm-radius-sm)] border p-3" style={{ borderColor: "var(--adm-line)" }}>
            <p className="font-sans text-[13px] font-semibold" style={ink}>
              {preview.subject}
            </p>
            <p className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] leading-[1.6]" style={ink2}>
              {preview.text}
            </p>
          </div>

          <p className="font-sans text-[11.5px]" style={ink3}>
            This wording is a draft for your review. The terms themselves are a stop condition in AGENTS.md, so
            read the email above before sending it the first time.
          </p>

          {ledgerMissing && (
            <p className="font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
              Send is off until supabase/migrations/20260914_email_sends.sql is applied: without the send log,
              nothing guarantees each account gets this once.
            </p>
          )}
          {preview.audienceError && (
            <p className="font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
              {preview.audienceError}
            </p>
          )}
          {!preview.complete && !preview.audienceError && (
            <p className="font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
              There are more accounts than one pass reads, so Send refuses rather than reach only some of them.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          {error}
        </p>
      )}

      {result && (
        <p className="mt-3 font-sans text-[12.5px]" style={ink2}>
          Terms {result.version}: {result.sent} sent, {result.duplicate} already had it, {result.failed} failed,{" "}
          {result.skipped} skipped (email not configured), of {result.accounts} accounts. Press Send again to
          retry the failed and skipped ones only.
        </p>
      )}

      {confirming && preview && (
        <Modal
          title={`Send the terms notice to ${preview.accounts ?? 0} accounts?`}
          subtitle={`Terms ${preview.version}, effective ${preview.effective}. Accounts that already have it are skipped.`}
          onClose={() => setConfirming(false)}
        >
          <div className="space-y-4">
            {!canSend ? (
              <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-warn)" }}>
                This cannot send yet. Close this and read the note on the card.
              </p>
            ) : (
              <p className="font-sans text-[12.5px] leading-[1.6]" style={ink2}>
                Every account gets &ldquo;{preview.subject}&rdquo;. This cannot be unsent.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <ToolbarButton onClick={() => setConfirming(false)}>Cancel</ToolbarButton>
              {canSend && (
                <ToolbarButton variant="primary" loading={busy} onClick={send}>
                  Send it
                </ToolbarButton>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
