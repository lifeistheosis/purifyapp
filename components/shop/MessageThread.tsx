"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
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
  onSent,
}: {
  conversationId: string;
  messages: ShopMessage[];
  viewer: "buyer" | "seller";
  closed: boolean;
  counterpartyName: string;
  /** Client pages pass a reload; without it we fall back to router.refresh()
   *  for the server-rendered seller context. */
  onSent?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Mark read once on open; the server no-ops harmlessly on repeats.
    void apiFetch("/api/shop/messages", {
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
      const res = await apiFetch("/api/shop/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, body: text }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setBody("");
        if (onSent) onSent();
        else router.refresh();
        return;
      }
      setError(data.error ?? "Couldn't send the message.");
    } catch {
      setError("Couldn't send the message.");
    } finally {
      setBusy(false);
    }
  }

  const initial = counterpartyName.trim().charAt(0).toUpperCase() || "S";

  return (
    <div>
      <ol className="space-y-3" aria-label="Messages">
        {messages.map((m, idx) => {
          const mine = m.sender === viewer;
          // Show the avatar only on the first bubble of a run, the way
          // every messaging surface people already know does it.
          const firstOfRun = idx === 0 || messages[idx - 1].sender !== m.sender;
          return (
            <li key={m.id} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
              {!mine ? (
                firstOfRun ? (
                  <span
                    aria-hidden
                    className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-display-serif text-detail text-gold"
                  >
                    {initial}
                  </span>
                ) : (
                  <span aria-hidden className="w-8 shrink-0" />
                )
              ) : null}
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
        // The composer stays within thumb's reach while the thread scrolls
        // behind it, one field and one send pill, nothing else.
        <form
          onSubmit={send}
          className="sticky bottom-0 z-10 -mx-1 mt-6 rounded-t-xl bg-night/95 px-1 pb-2 pt-3 backdrop-blur safe-pb"
        >
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Reply</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder={`Write to ${counterpartyName}…`}
                className={cn(field, "resize-none rounded-2xl")}
              />
            </label>
            <button
              type="submit"
              disabled={busy || !body.trim()}
              aria-label={busy ? "Sending" : "Send"}
              className="tap-press inline-flex h-11 shrink-0 items-center justify-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
            >
              {busy ? "…" : "Send"}
            </button>
          </div>
          {error ? (
            <p role="alert" className="mt-2 font-sans text-detail text-crimson-soft">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
