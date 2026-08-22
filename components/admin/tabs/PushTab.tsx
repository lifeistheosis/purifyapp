"use client";

// Push — compose and send a broadcast notification to a chosen audience,
// with a live recipient count and a two-step confirm before anything
// leaves. Every send is logged to push_broadcasts (the history table).
// Dry-run-safe: with no VAPID/APNs/FCM secrets set, "send" writes an
// enqueued log row and nothing actually goes out.

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, DataTable, Pill, ToolbarButton } from "../primitives";

type Audience = "all" | "plus" | "pro" | "web" | "native";
const AUDIENCES: [Audience, string][] = [
  ["all", "Everyone"],
  ["plus", "Plus subscribers"],
  ["pro", "Pro members"],
  ["web", "Web push"],
  ["native", "App (iOS/Android)"],
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

const input =
  "w-full rounded-[var(--adm-radius-sm)] border border-paper/20 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/35 focus:border-gold focus:outline-none";

export function PushTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [audience, setAudience] = useState<Audience>("all");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // Re-preview when the audience changes (the audience buttons also drop
  // any pending confirm, so the effect stays side-effect-free on mount).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await adminJson<Preview>("/api/admin/push/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audience }),
        });
        if (alive && d) setPreview(d);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [audience]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await adminJson<{ broadcasts?: Broadcast[] }>("/api/admin/push/send");
        if (alive && d) setHistory(d.broadcasts ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const canCompose = title.trim().length > 0 && body.trim().length > 0;
  const willDryRun =
    preview && !preview.configured.web && !preview.configured.ios && !preview.configured.fcm;

  async function send() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || "/",
          audience,
          confirm: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setNote(j.error ?? "Send failed.");
      } else {
        setNote(
          j.status === "sent"
            ? `Sent to ${j.recipients} recipient(s).`
            : j.status === "enqueued"
              ? `Nothing was delivered: no push secrets are set, so every transport dry-ran. ${j.recipients} device(s) would have received it.`
              : `Attempted ${j.recipients}; all deliveries failed.`,
        );
        setTitle("");
        setBody("");
        setReloadKey((k) => k + 1);
      }
    } catch {
      setNote("Send failed.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Compose broadcast" accent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
                Title
              </span>
              <input
                className={input}
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A word from Purify"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
                Body
              </span>
              <textarea
                className={input}
                rows={3}
                value={body}
                maxLength={300}
                onChange={(e) => setBody(e.target.value)}
                placeholder="The message people will see."
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
                Opens (deep link)
              </span>
              <input
                className={input}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/prayers/today"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1 block font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
                Audience
              </p>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAudience(id)}
                    aria-pressed={audience === id}
                    className={
                      "rounded-pill px-3 py-1.5 font-sans text-detail font-medium transition-colors " +
                      (audience === id
                        ? "bg-gold text-night"
                        : "border border-paper/15 text-paper/65 hover:text-paper")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[var(--adm-radius)] border border-paper/10 bg-night p-4">
              <p className="font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
                Recipients
              </p>
              <p className="mt-1 font-sans text-heading font-bold tabular-nums text-[color:var(--adm-ink)]">
                {preview ? preview.total : "—"}
              </p>
              {preview && (
                <p className="mt-1 font-sans text-eyebrow text-paper/45">
                  {preview.web} web · {preview.native} app
                </p>
              )}
            </div>

            {willDryRun && (
              <p className="rounded-[var(--adm-radius-sm)] border border-[color-mix(in_oklab,var(--adm-warn),transparent_70%)] bg-[color-mix(in_oklab,var(--adm-warn),transparent_94%)] px-3 py-2 font-sans text-eyebrow text-[color:var(--adm-warn)]">
                No push credentials are set, so a send is logged but nothing
                actually goes out (dry run).
              </p>
            )}
          </div>
        </div>

        {/* Live preview of the notification */}
        {canCompose && (
          <div className="mt-5 rounded-[var(--adm-radius)] border border-paper/12 bg-night p-3">
            <p className="font-sans text-caption font-medium text-[color:var(--adm-ink-3)] mb-1.5">
              Preview
            </p>
            <div className="rounded-[var(--adm-radius)] bg-paper/[0.05] p-3">
              <p className="font-sans text-detail font-semibold text-paper">
                {title}
              </p>
              <p className="font-sans text-detail text-paper/70">{body}</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          {!confirming ? (
            <ToolbarButton
              variant="primary"
              loading={busy || !canCompose || !preview}
              onClick={() => setConfirming(true)}
            >
              Review send
            </ToolbarButton>
          ) : (
            <>
              <ToolbarButton variant="danger" loading={busy} onClick={send}>
                {busy
                  ? "Sending…"
                  : `Confirm: send to ${preview?.total ?? 0}`}
              </ToolbarButton>
              <ToolbarButton onClick={() => setConfirming(false)}>
                Cancel
              </ToolbarButton>
            </>
          )}
          {note && (
            <span className="font-sans text-detail text-paper/70">{note}</span>
          )}
        </div>
      </Card>

      <Card title="Broadcast history">
        <DataTable<Broadcast>
          rows={history}
          rowKey={(b) => b.id}
          csvFilename="push-broadcasts.csv"
          empty="No broadcasts yet."
          columns={[
            {
              key: "date",
              label: "Sent",
              render: (b) => new Date(b.created_at).toLocaleString(),
              csv: (b) => b.created_at,
            },
            { key: "title", label: "Title", render: (b) => b.title, csv: (b) => b.title },
            {
              key: "audience",
              label: "Audience",
              render: (b) => b.audience,
              csv: (b) => b.audience,
            },
            {
              key: "recipients",
              label: "Recipients",
              align: "right",
              render: (b) => b.recipients_count,
              csv: (b) => b.recipients_count,
            },
            {
              key: "status",
              label: "Status",
              render: (b) => (
                <Pill
                  tone={
                    b.status === "sent"
                      ? "emerald"
                      : b.status === "failed"
                        ? "rose"
                        : "neutral"
                  }
                >
                  {b.status}
                </Pill>
              ),
              csv: (b) => b.status,
            },
            {
              key: "by",
              label: "By",
              render: (b) => b.created_by_email ?? "—",
              csv: (b) => b.created_by_email ?? "",
            },
          ]}
        />
      </Card>
    </div>
  );
}
