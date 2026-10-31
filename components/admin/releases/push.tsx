"use client";

// A notification to readers' devices: step 5 of the one path, "a few days
// later" (his pick A for Releases on r3-17, 2026-10-30), and "Notifications
// sent" under its Records.
//
// Compose and send a broadcast to a chosen audience, with a live count of
// who receives it and a two-step confirm before anything leaves. Every send
// is logged to push_broadcasts (the history). Dry-run-safe: with no VAPID,
// APNs or FCM secrets set, a send writes an enqueued log row and nothing goes
// out.
//
// THE RULES ARE SAID FIRST. They used to be said only after a send was
// refused: no digits, a title of 60 characters and a body of 120 at most, no
// exclamation marks, no clock put on the reader, no praise
// (lib/push/doctrine.ts). Now the composer runs the same check as you type,
// and Review send waits until it passes.

import { useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { MAX_BODY, MAX_TITLE, checkNotificationCopy } from "@/lib/push/doctrine";

import { DataTable, Email, Pill, ToolbarButton } from "../primitives";
import { DeliveryStatus } from "../push/DeliveryStatus";

type Audience = "all" | "plus" | "pro" | "web" | "native";
const AUDIENCES: [Audience, string][] = [
  ["all", "Everyone"],
  ["plus", "Plus subscribers"],
  ["pro", "Pro members"],
  ["web", "Web push"],
  ["native", "App (iOS and Android)"],
];

type Preview = {
  web: number;
  native: number;
  total: number;
  configured: { web: boolean; ios: boolean; fcm: boolean };
};

type Broadcast = {
  id: string;
  title: string;
  audience: string;
  recipients_count: number;
  created_by_email: string | null;
  status: string;
  created_at: string;
};

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;
const fieldCls = "w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[13px] outline-none";
const fieldStyle = { borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" } as const;

/** The recipients a send would reach, for the step's line and the composer. */
export function usePushPreview(audience: Audience) {
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => {
    let alive = true;
    void adminJson<Preview>("/api/admin/push/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience }),
    }).then((d) => {
      if (alive && d) setPreview(d);
    });
    return () => {
      alive = false;
    };
  }, [audience]);
  return preview;
}

/**
 * The composer. `initial` is the drop's own words for the notification, when
 * the drop has them, so the step opens with the text ready to read.
 */
export function PushComposer({ initial, onSent }: { initial?: { title?: string; body?: string }; onSent?: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [url, setUrl] = useState("/");
  const [audience, setAudience] = useState<Audience>("all");
  const preview = usePushPreview(audience);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const problems = checkNotificationCopy({ title: title.trim(), body: body.trim() });
  const filled = title.trim().length > 0 && body.trim().length > 0;
  const canSend = filled && problems.length === 0 && Boolean(preview);
  const willDryRun = preview && !preview.configured.web && !preview.configured.ios && !preview.configured.fcm;

  async function send() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || "/", audience, confirm: true }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; status?: string; recipients?: number; warning?: string };
      if (!res.ok) {
        setNote(j.error ?? "Send failed.");
      } else {
        // The server's warning names the platform, the device count and the
        // exact variables missing (lib/push/deliveryGaps.ts).
        const warning = typeof j.warning === "string" ? j.warning : "";
        setNote(
          j.status === "sent"
            ? `Sent to ${j.recipients} recipients.${warning ? ` ${warning}` : ""}`
            : j.status === "enqueued"
              ? warning || `Nothing was delivered. ${j.recipients} devices would have received it.`
              : `Attempted ${j.recipients}; all deliveries failed.${warning ? ` ${warning}` : ""}`,
        );
        // Keep the draft when nothing left the server, so it is not retyped
        // after the keys are fixed.
        if (j.status !== "enqueued") {
          setTitle("");
          setBody("");
        }
        onSent?.();
      }
    } catch {
      setNote("Send failed.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="font-sans text-[12px] leading-[1.55]" style={ink3}>
        The rules, before you write: no digits, a title of {MAX_TITLE} characters and a body of {MAX_BODY} at most (a lock
        screen cuts the rest), no exclamation marks, no clock put on the reader, no praise.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 flex font-sans text-[11.5px]" style={ink3}>
              Title
              <span className="ml-auto font-mono">
                {title.trim().length} of {MAX_TITLE}
              </span>
            </span>
            <input className={`${fieldCls} h-11`} style={fieldStyle} value={title} maxLength={MAX_TITLE + 20} onChange={(e) => setTitle(e.target.value)} placeholder="A word from Purify" />
          </label>
          <label className="block">
            <span className="mb-1 flex font-sans text-[11.5px]" style={ink3}>
              Body
              <span className="ml-auto font-mono">
                {body.trim().length} of {MAX_BODY}
              </span>
            </span>
            <textarea className={fieldCls} style={fieldStyle} rows={3} value={body} maxLength={MAX_BODY + 40} onChange={(e) => setBody(e.target.value)} placeholder="The message people will see." />
          </label>
          <label className="block">
            <span className="mb-1 block font-sans text-[11.5px]" style={ink3}>
              Opens (a link in the app)
            </span>
            <input className={`${fieldCls} h-11`} style={fieldStyle} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/prayers/today" />
          </label>
        </div>
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block font-sans text-[11.5px]" style={ink3}>
              Who receives it
            </span>
            <select
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value as Audience);
                setConfirming(false);
              }}
              className={`${fieldCls} h-11`}
              style={fieldStyle}
            >
              {AUDIENCES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="font-sans text-[13px]" style={ink2}>
            <span className="font-semibold" style={ink}>
              {preview ? preview.total.toLocaleString("en-US") : "Counting"}
            </span>{" "}
            {preview ? `devices: ${preview.web} on the web, ${preview.native} in the apps.` : "the devices."}
          </p>
          {willDryRun ? (
            <p className="rounded-[var(--adm-radius-sm)] border border-dashed px-3 py-2 font-sans text-[12px]" style={{ borderColor: "var(--adm-ink)", ...ink2 }}>
              No push credentials are set, so a send is logged and nothing goes out.
            </p>
          ) : null}
          {filled ? (
            <div className="rounded-[var(--adm-radius-sm)] px-3 py-2" style={{ background: "var(--adm-panel-2)" }}>
              <p className="font-sans text-[11.5px]" style={ink3}>
                As a lock screen shows it
              </p>
              <p className="font-sans text-[13px] font-semibold" style={ink}>
                {title.trim().slice(0, MAX_TITLE)}
              </p>
              <p className="font-sans text-[13px]" style={ink2}>
                {body.trim().slice(0, MAX_BODY)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {filled && problems.length > 0 ? (
        <ul className="space-y-1">
          {problems.map((p) => (
            <li key={p.clause} className="font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
              {p.clause.charAt(0).toUpperCase() + p.clause.slice(1)}: {p.reason}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {!confirming ? (
          <ToolbarButton variant="primary" loading={busy || !canSend} onClick={() => setConfirming(true)}>
            Review send
          </ToolbarButton>
        ) : (
          <>
            <ToolbarButton variant="danger" loading={busy} onClick={send}>
              {busy ? "Sending" : `Send to ${preview?.total ?? 0} devices`}
            </ToolbarButton>
            <ToolbarButton onClick={() => setConfirming(false)}>Cancel</ToolbarButton>
          </>
        )}
        {note ? (
          <span role="status" className="font-sans text-[12.5px]" style={ink2}>
            {note}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** "Notifications sent" under Records: whether delivery works, and every broadcast. */
export function PushRecord() {
  const [history, setHistory] = useState<Broadcast[] | null>(null);
  useEffect(() => {
    let alive = true;
    void adminJson<{ broadcasts?: Broadcast[] }>("/api/admin/push/send").then((d) => {
      if (alive) setHistory(d?.broadcasts ?? []);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <DeliveryStatus />
      <DataTable<Broadcast>
        rows={history ?? []}
        rowKey={(b) => b.id}
        csvFilename="push-broadcasts.csv"
        empty={history ? "No broadcasts yet." : "Reading the history."}
        columns={[
          { key: "date", label: "Sent", render: (b) => new Date(b.created_at).toLocaleString(), csv: (b) => b.created_at },
          { key: "title", label: "Title", render: (b) => b.title, csv: (b) => b.title },
          { key: "audience", label: "Audience", render: (b) => b.audience, csv: (b) => b.audience },
          { key: "recipients", label: "Recipients", align: "right", render: (b) => b.recipients_count, csv: (b) => b.recipients_count },
          {
            key: "status",
            label: "Status",
            render: (b) => <Pill tone={b.status === "sent" ? "emerald" : b.status === "failed" ? "rose" : "neutral"}>{b.status}</Pill>,
            csv: (b) => b.status,
          },
          { key: "by", label: "By", render: (b) => <Email value={b.created_by_email} />, csv: (b) => b.created_by_email ?? "" },
        ]}
      />
    </div>
  );
}

/** How many broadcasts have gone, for the Records line. */
export function usePushCount() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    void adminJson<{ broadcasts?: Broadcast[] }>("/api/admin/push/send").then((d) => {
      if (alive && d) setN((d.broadcasts ?? []).length);
    });
    return () => {
      alive = false;
    };
  }, []);
  return n;
}
