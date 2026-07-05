"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";
import type { ShopMessage } from "@/lib/shop/types";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";

/**
 * One conversation, chat-style: my side right and gold-tinted, theirs
 * left and quiet, a composer pinned under the scroll. Shared by both
 * consoles — `viewer` decides which bubbles are "mine". Opening the
 * thread marks it read for the viewer's side (fire-and-forget).
 */
export function MessageThread({
  conversationId,
  messages,
  viewer,
  closed,
  counterpartyName,
}: {
  conversationId: string;
  messages: ShopMessage[];
  viewer: "buyer" | "seller";
  closed: boolean;
  counterpartyName: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Mark read once on open; the server no-ops harmlessly on repeats.
    void fetch("/api/shop/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    }).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, body: text }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setBody("");
        router.refresh();
        return;
      }
      setError(data.error ?? "Couldn't send the message.");
    } catch {
      setError("Couldn't send the message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ol className="space-y-3" aria-label="Messages">
        {messages.map((m) => {
          const mine = m.sender === viewer;
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[70%]",
                  mine
                    ? "rounded-br-md bg-gold/15 text-paper"
                    : "rounded-bl-md border border-paper/10 bg-night-soft/70 text-paper/90",
                )}
              >
                <p className="whitespace-pre-wrap font-sans text-ui leading-relaxed">
                  {m.body}
                </p>
                <p className="mt-1.5 text-right font-sans text-[10px] text-paper/45">
                  {mine ? "You" : counterpartyName} ·{" "}
                  {new Date(m.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />

      {closed ? (
        <p className="mt-6 rounded-md border border-paper/10 bg-night-soft/60 p-4 font-sans text-detail text-paper/60">
          This conversation is closed.
        </p>
      ) : (
        <form onSubmit={send} className="mt-6">
          <label className="block">
            <span className="sr-only">Reply</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder={`Write to ${counterpartyName}…`}
              className={field}
            />
          </label>
          {error ? (
            <p role="alert" className="mt-2 font-sans text-detail text-crimson-soft">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="tap-press mt-3 inline-flex min-h-[44px] items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}
