"use client";

// Review and send for the two email lists. Pick what to send, read exactly
// what will go out and to how many readers, then send it or leave it. Every
// draft is built from the app's own data (the calendar, the library, the patch
// note, the shop), so there is no copy to write and nothing sends unread.

import { useState } from "react";

import { JOB_ORDER_LABEL, type JobOrder } from "@/lib/email/audienceOrder";
import type { Budget } from "@/lib/email/budget";
import type { EmailJob } from "@/lib/email/jobs";

import { Card, Modal, Pill, ToolbarButton } from "../primitives";
import { SendOrderControls } from "./SendOrderControls";

type Kind = "weekly" | "monthly" | "release" | "shop_new" | "shop_feast";

type Preview = {
  kind: Kind;
  listLabel: string;
  periodKey: string;
  subject: string | null;
  text: string | null;
  reason: string | null;
  subscribers: number;
  subscribersError: string | null;
  cadenceSkips: number;
  alreadySent: { at: string; sent: number } | null;
  postalAddressSet: boolean;
  violations: string[];
  budget: Budget;
  /** The send already started for this period, if there is one. */
  job: EmailJob | null;
  /** False when email_jobs is not applied yet. */
  jobsReady: boolean;
};

type SendResult = {
  ok: boolean;
  periodKey: string;
  run: {
    counts: Record<string, number>;
    /** Subscribers still owed it after today's share. */
    owed: number;
    /** Owed, but resting under the one-email-a-week rule. */
    resting: number;
    note: string | null;
  };
};

const KINDS: { kind: Kind; label: string; when: string }[] = [
  { kind: "weekly", label: "Sunday calendar", when: "Sundays. The week's feasts and saints." },
  { kind: "monthly", label: "Monthly note", when: "The 1st. What was added, counted." },
  { kind: "release", label: "Release email", when: "Hard pushes only. The patch note, unchanged." },
  { kind: "shop_new", label: "New in the shop", when: "When pieces arrive. One email for the group." },
  { kind: "shop_feast", label: "Feast window", when: "Before the Nativity Fast and before Pascha." },
];

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

export function CampaignCard({ onStarted }: { onStarted?: () => void }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [order, setOrder] = useState<JobOrder>("oldest");
  const [perDay, setPerDay] = useState<number | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  async function load(k: Kind) {
    setKind(k);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/email/campaign?kind=${k}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as (Preview & { error?: string }) | null;
      if (!res.ok || !data) setError(data?.error ?? `The draft did not load (${res.status}).`);
      else setPreview(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!preview) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/email/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: preview.kind, periodKey: preview.periodKey, confirm: true, order, perDay }),
      });
      const data = (await res.json().catch(() => null)) as (SendResult & { error?: string }) | null;
      if (!res.ok || !data?.ok) setError(data?.error ?? `The send did not go (${res.status}).`);
      else {
        setResult(data);
        onStarted?.();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  const blockers: string[] = [];
  if (preview) {
    if (!preview.text) blockers.push(preview.reason ?? "There is nothing to send.");
    if (preview.alreadySent) blockers.push(`This already went out on ${new Date(preview.alreadySent.at).toLocaleDateString()}.`);
    if (preview.job) blockers.push(`This is already ${preview.job.status === "running" ? "going out, a share a day" : preview.job.status}. See Going out.`);
    if (preview.violations.length) blockers.push("The words do not pass the email rules. See below.");
    if (!preview.postalAddressSet) blockers.push("Held until EMAIL_POSTAL_ADDRESS is set on the server. The law requires it on marketing email.");
    if (preview.subscribers === 0) blockers.push(`Nobody has turned on "${preview.listLabel}" yet.`);
  }
  const canSend = !!preview && blockers.length === 0;
  const reach = preview ? preview.subscribers - preview.cadenceSkips : 0;

  return (
    <Card
      title="Lists"
      subtitle="The two optional lists readers turn on in their account. Pick one, read it, send it."
    >
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <ToolbarButton key={k.kind} variant={kind === k.kind ? "primary" : "default"} onClick={() => load(k.kind)} title={k.when}>
            {k.label}
          </ToolbarButton>
        ))}
      </div>

      {loading && (
        <p className="mt-3 font-sans text-[12.5px]" style={ink3}>
          Building the draft…
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          {error}
        </p>
      )}

      {preview && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 font-sans text-[12.5px]" style={ink2}>
            <Pill>{preview.listLabel}</Pill>
            <span>{preview.periodKey}</span>
            <span style={ink3}>·</span>
            <span>
              {preview.subscribers} subscribed
              {preview.cadenceSkips ? `, ${preview.cadenceSkips} skipped by the one-a-week rule` : ""}
            </span>
          </div>

          {preview.text ? (
            <div className="rounded-[var(--adm-radius-sm)] border p-3" style={{ borderColor: "var(--adm-line)" }}>
              <p className="whitespace-pre-wrap font-sans text-[12.5px] leading-[1.6]" style={ink2}>
                <span className="font-semibold" style={ink}>
                  {preview.subject}
                </span>
                {"\n\n"}
                {preview.text.split("\n\n").slice(1).join("\n\n")}
              </p>
              <p className="mt-2 font-sans text-[11.5px]" style={ink3}>
                Each reader&apos;s copy also carries the unsubscribe link, the one-click headers and the postal address.
              </p>
            </div>
          ) : null}

          {preview.violations.length > 0 && (
            <ul className="font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
              {preview.violations.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          )}

          {blockers.length === 0 && <SendOrderControls order={order} onOrder={setOrder} perDay={perDay} onPerDay={setPerDay} />}

          {blockers.length > 0 ? (
            <ul className="space-y-1 font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <ToolbarButton variant="primary" onClick={() => setConfirming(true)}>
              {`Send to ${reach} reader${reach === 1 ? "" : "s"}`}
            </ToolbarButton>
          )}
        </div>
      )}

      {result && (
        <p className="mt-3 font-sans text-[12.5px]" style={ink2}>
          Sent {result.run.counts.sent ?? 0} today, failed {result.run.counts.failed ?? 0}.
          {result.run.owed > 0
            ? ` ${result.run.owed} still to go, a share a day; ${result.run.resting} of those are resting under the one-a-week rule.`
            : " Everyone on the list has it."}
          {result.run.note ? ` ${result.run.note}` : ""}
        </p>
      )}

      {confirming && preview && canSend && (
        <Modal
          title={`Send "${preview.subject}"?`}
          subtitle={`${reach} reader${reach === 1 ? "" : "s"} on "${preview.listLabel}", ${JOB_ORDER_LABEL[order].toLowerCase()}. This cannot be unsent.`}
          onClose={() => setConfirming(false)}
        >
          <div className="flex justify-end gap-2">
            <ToolbarButton onClick={() => setConfirming(false)}>Cancel</ToolbarButton>
            <ToolbarButton variant="primary" loading={sending} onClick={send}>
              Send it
            </ToolbarButton>
          </div>
        </Modal>
      )}
    </Card>
  );
}
