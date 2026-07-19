"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import type { ShopMessage } from "@/lib/shop/types";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";

const HEART = "❤️";
const DOUBLE_TAP_MS = 300;

/**
 * One conversation, chat-style: my side right and gold-tinted, theirs
 * left and quiet, a composer pinned under the scroll. Shared by both
 * consoles — `viewer` decides which bubbles are "mine". Opening the
 * thread marks it read for the viewer's side (fire-and-forget).
 *
 * Two live-chat touches beyond plain bubbles: double-tap (or the small heart
 * button) hearts a message, and the viewer's latest message shows a truthful
 * Delivered/Read receipt derived from the counterparty's last_read_at.
 */
export function MessageThread({
  conversationId,
  messages,
  viewer,
  closed,
  counterpartyName,
  counterpartyLastReadAt,
  onSent,
}: {
  conversationId: string;
  messages: ShopMessage[];
  viewer: "buyer" | "seller";
  closed: boolean;
  counterpartyName: string;
  /** The other party's last_read_at, for the Delivered/Read receipt. */
  counterpartyLastReadAt?: string | null;
  /** Client pages pass a reload; without it we fall back to router.refresh()
   *  for the server-rendered seller context. */
  onSent?: () => void;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  // Optimistic reaction overlay, keyed by message id. Message ids are unique
  // UUIDs, so an overlay entry never collides with another thread's message —
  // no reset needed on thread change. Within a thread it always reflects the
  // viewer's latest intent and matches what was persisted.
  const [reactions, setReactions] = useState<Record<string, string | null>>({});
  const lastTapRef = useRef<{ id: string; t: number } | null>(null);

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

  function reactionOf(m: ShopMessage): string | null {
    return m.id in reactions ? reactions[m.id] : m.reaction ?? null;
  }

  // Toggle the heart. Optimistic: flip locally, then persist fire-and-forget.
  function toggleReaction(m: ShopMessage) {
    if (closed) return;
    const next = reactionOf(m) === HEART ? null : HEART;
    setReactions((r) => ({ ...r, [m.id]: next }));
    void apiFetch("/api/shop/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, messageId: m.id, reaction: next }),
    }).catch(() => {});
  }

  // Touch double-tap: ondblclick is unreliable on phones, so track the last
  // tap ourselves off the touch event's own timestamp (pure — no Date.now).
  // A second tap on the same bubble within the window hearts it, and we cancel
  // the browser's synthesized double-click so it doesn't toggle twice.
  function handleTouchEnd(m: ShopMessage, e: React.TouchEvent) {
    const now = e.timeStamp;
    const last = lastTapRef.current;
    if (last && last.id === m.id && now - last.t < DOUBLE_TAP_MS) {
      e.preventDefault();
      lastTapRef.current = null;
      toggleReaction(m);
    } else {
      lastTapRef.current = { id: m.id, t: now };
    }
  }

  const initial = counterpartyName.trim().charAt(0).toUpperCase() || "S";

  // The viewer's most recent message carries the Delivered/Read receipt.
  let lastOwnIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === viewer) {
      lastOwnIdx = i;
      break;
    }
  }
  const counterpartyReadMs = counterpartyLastReadAt
    ? new Date(counterpartyLastReadAt).getTime()
    : null;

  return (
    <div>
      <ol className="space-y-3" aria-label={t("shop.messages")}>
        {messages.map((m, idx) => {
          const mine = m.sender === viewer;
          // Show the avatar only on the first bubble of a run, the way
          // every messaging surface people already know does it.
          const firstOfRun = idx === 0 || messages[idx - 1].sender !== m.sender;
          const reaction = reactionOf(m);
          const reacted = reaction === HEART;
          const isLastOwn = idx === lastOwnIdx;
          const receipt = isLastOwn
            ? counterpartyReadMs !== null &&
              counterpartyReadMs >= new Date(m.created_at).getTime()
              ? "Read"
              : "Delivered"
            : null;
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
              <div className={cn("group flex flex-col", mine ? "items-end" : "items-start")}>
                <div
                  onDoubleClick={() => toggleReaction(m)}
                  onTouchEnd={(e) => handleTouchEnd(m, e)}
                  className={cn(
                    "relative max-w-[85%] select-none rounded-2xl px-4 py-3 md:max-w-[70%]",
                    mine
                      ? "rounded-br-md bg-gold/15 text-paper"
                      : "rounded-bl-md border border-paper/10 bg-night-soft/70 text-paper/90",
                  )}
                >
                  <p className="select-text whitespace-pre-wrap font-sans text-ui leading-relaxed">
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
                  {reacted ? (
                    <span
                      className={cn(
                        "heart-pop absolute -bottom-2 rounded-full border border-paper/15 bg-night px-1.5 py-0.5 text-[11px] leading-none shadow-sm",
                        mine ? "left-2" : "right-2",
                      )}
                    >
                      {HEART}
                    </span>
                  ) : null}
                </div>
                <div className={cn("mt-1 flex items-center gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                  {!closed ? (
                    <button
                      type="button"
                      onClick={() => toggleReaction(m)}
                      aria-pressed={reacted}
                      aria-label={reacted ? "Remove heart reaction" : "React with a heart"}
                      className={cn(
                        "leading-none transition-opacity focus-visible:opacity-100 group-hover:opacity-100",
                        reacted
                          ? "text-[13px] opacity-100"
                          : "text-[13px] opacity-40 md:opacity-0",
                      )}
                    >
                      {reacted ? HEART : "🤍"}
                    </button>
                  ) : null}
                  {receipt ? (
                    <span
                      className="font-sans text-[10px] font-medium tabular-nums text-paper/40"
                      aria-label={`Message ${receipt.toLowerCase()}`}
                    >
                      {receipt}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />

      {closed ? (
        <p className="mt-6 rounded-md border border-paper/10 bg-night-soft/60 p-4 font-sans text-detail text-paper/60">
          {t("shop.thisConversationIsClosed")}
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
              <span className="sr-only">{t("shop.reply")}</span>
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
