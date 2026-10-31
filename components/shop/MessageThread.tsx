"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { StoreAvatar } from "@/components/shop/EikonMarks";
import { Composer, DayRule, dayKey, timeOf } from "@/components/shop/threadParts";
import { Heart } from "@/components/ui/icons/Heart";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import type { ShopMessage } from "@/lib/shop/types";

/** The stored reaction. Only the heart exists; the page draws it, never the emoji. */
const HEART = "❤️";
const DOUBLE_TAP_MS = 300;

/**
 * One conversation, chat-style: my side right and quiet, theirs left and
 * raised, each day under its own heading, the composer clear of the last
 * message. Shared by both consoles: `viewer` decides which bubbles are
 * "mine". Opening the thread marks it read for the viewer's side
 * (fire-and-forget).
 *
 * Redrawn for 1.8 (r3-19, Messages A, the owner's pick of 2026-10-31): the
 * heart is the app's own drawing, white with a short glow when given, never
 * the red emoji (build 85 put an emoji heart under every bubble, the one
 * colour on the page); the store's seal or initial stands beside its last
 * bubble of a run; and on a phone the composer is held above the tab bar
 * with room kept for it, where build 85 had it over "Thank you!".
 *
 * Two live-chat touches beyond plain bubbles: double-tap (or the small heart
 * button) hearts a message, and the viewer's latest message shows a truthful
 * Delivered/Read receipt derived from the counterparty's last_read_at. A
 * message that arrives while the thread is open rises a few pixels as it
 * fades in (`.shop-rise`, on the app's motion switch).
 */
export function MessageThread({
  conversationId,
  messages,
  viewer,
  closed,
  counterpartyName,
  counterpartySeal = false,
  counterpartyLastReadAt,
  onSent,
}: {
  conversationId: string;
  messages: ShopMessage[];
  viewer: "buyer" | "seller";
  closed: boolean;
  counterpartyName: string;
  /** The counterparty wears EIKON's seal rather than an initial. */
  counterpartySeal?: boolean;
  /** The other party's last_read_at, for the Delivered/Read receipt. */
  counterpartyLastReadAt?: string | null;
  /** Client pages pass a reload; without it we fall back to router.refresh()
   *  for the server-rendered seller context. */
  onSent?: () => void;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement | null>(null);
  // Optimistic reaction overlay, keyed by message id. Message ids are unique
  // UUIDs, so an overlay entry never collides with another thread's message:
  // no reset needed on thread change. Within a thread it always reflects the
  // viewer's latest intent and matches what was persisted.
  const [reactions, setReactions] = useState<Record<string, string | null>>({});
  const lastTapRef = useRef<{ id: string; t: number } | null>(null);
  // What was there when the thread opened; anything after it rises in.
  const [opened] = useState(() => new Set(messages.map((m) => m.id)));

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

  async function send(text: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await apiFetch("/api/shop/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, body: text }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        if (onSent) onSent();
        else router.refresh();
        return { ok: true };
      }
      return { ok: false, error: data.error ?? t("shop.messageSendFailed") };
    } catch {
      return { ok: false, error: t("shop.messageSendFailed") };
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
  // tap ourselves off the touch event's own timestamp (pure, no Date.now).
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

  // The viewer's most recent message carries the Delivered/Read receipt.
  let lastOwnIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === viewer) {
      lastOwnIdx = i;
      break;
    }
  }
  const counterpartyReadMs = counterpartyLastReadAt ? new Date(counterpartyLastReadAt).getTime() : null;

  return (
    <div data-thread>
      <ol aria-label={t("shop.messages")}>
        {messages.map((m, idx) => {
          const mine = m.sender === viewer;
          const newDay = idx === 0 || dayKey(messages[idx - 1].created_at) !== dayKey(m.created_at);
          // The avatar stands by the last bubble of a run, the way every
          // messaging surface people already know does it.
          const lastOfRun = idx === messages.length - 1 || messages[idx + 1].sender !== m.sender;
          const reacted = reactionOf(m) === HEART;
          const receipt: "read" | "delivered" | null =
            idx === lastOwnIdx
              ? counterpartyReadMs !== null && counterpartyReadMs >= new Date(m.created_at).getTime()
                ? "read"
                : "delivered"
              : null;
          return (
            <Fragment key={m.id}>
              {newDay ? <DayRule iso={m.created_at} /> : null}
              <li
                className={cn(
                  "flex items-end gap-2",
                  mine ? "justify-end" : "justify-start",
                  reacted ? "mb-5" : "mb-2.5",
                  !opened.has(m.id) && "shop-rise",
                )}
              >
                {!mine ? (
                  lastOfRun ? (
                    <span className="mb-0.5">
                      <StoreAvatar name={counterpartyName} seal={counterpartySeal} size={28} />
                    </span>
                  ) : (
                    <span aria-hidden className="w-7 shrink-0" />
                  )
                ) : null}
                <div className={cn("group flex max-w-[80%] flex-col md:max-w-[70%]", mine ? "items-end" : "items-start")}>
                  <div
                    onDoubleClick={() => toggleReaction(m)}
                    onTouchEnd={(e) => handleTouchEnd(m, e)}
                    className={cn(
                      "relative select-none rounded-[20px] px-3.5 pb-[9px] pt-[11px]",
                      mine ? "shop-bubble-me rounded-br-md text-paper" : "shop-raise rounded-bl-md text-paper/95",
                    )}
                  >
                    <p className="select-text whitespace-pre-wrap font-sans text-[15px] leading-[1.45]">{m.body}</p>
                    <p className="mt-1 text-end font-sans text-[11px] text-paper/50">
                      {mine ? timeOf(m.created_at) : `${counterpartyName} · ${timeOf(m.created_at)}`}
                    </p>
                    {reacted ? (
                      <button
                        type="button"
                        onClick={() => toggleReaction(m)}
                        disabled={closed}
                        aria-pressed
                        aria-label={t("shop.removeHeartReaction")}
                        className={cn(
                          "shop-heart heart-pop absolute -bottom-[11px] inline-flex h-[22px] items-center rounded-pill px-[7px]",
                          mine ? "start-2.5" : "end-2.5",
                        )}
                      >
                        <Heart size={11} filled />
                      </button>
                    ) : null}
                  </div>
                  <div className={cn("mt-1 flex items-center gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                    {!closed && !reacted ? (
                      <button
                        type="button"
                        onClick={() => toggleReaction(m)}
                        aria-pressed={false}
                        aria-label={t("shop.reactWithAHeart")}
                        className="hit-44 text-paper/40 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0"
                      >
                        <Heart size={13} />
                      </button>
                    ) : null}
                    {receipt ? (
                      <span
                        className="font-sans text-[11px] font-medium tabular-nums text-paper/50"
                        aria-label={receipt === "read" ? t("shop.messageReadAria") : t("shop.messageDeliveredAria")}
                      >
                        {receipt === "read" ? t("shop.receiptRead") : t("shop.receiptDelivered")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            </Fragment>
          );
        })}
      </ol>

      {closed ? (
        <p className="shop-raise mt-6 rounded-[18px] p-4 font-sans text-detail text-paper/60">{t("shop.thisConversationIsClosed")}</p>
      ) : (
        <Composer
          placeholder={t("shop.writeToPlaceholder", { name: counterpartyName })}
          onSend={send}
          fixed={viewer === "buyer"}
        />
      )}
      <div ref={endRef} className="shop-thread-end" />
    </div>
  );
}
