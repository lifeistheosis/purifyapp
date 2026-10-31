"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { StoreAvatar } from "@/components/shop/EikonMarks";
import { OrderPin } from "@/components/shop/OrderPin";
import { ShopError, ShopLoading, ShopSignInPrompt } from "@/components/shop/ShopStates";
import { Composer, DayRule, dayKey, timeOf } from "@/components/shop/threadParts";
import { ThreadFrame, ThreadHead, ThreadNotFound } from "@/components/shop/ThreadFrame";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { readTicket, type TicketThreadData } from "@/lib/shop/buyerReads";
import { markTicketSeen } from "@/lib/shop/inbox";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import { AUTH_UNRESOLVED_MESSAGE, resolveUser } from "@/lib/supabase/resolveUser";

type Result = { signedIn: false } | { signedIn: true; thread: TicketThreadData | null; now: number };

async function load(id: string): Promise<Result> {
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  // support_tickets_owner_select: only the reader's own ticket comes back.
  const thread = await readTicket(createClient(), id);
  return { signedIn: true, thread, now: Date.now() };
}

/**
 * A support ticket in the shop's Messages (r3-19, Messages A, the owner's
 * pick of 2026-10-31): the owner's replies from the support console (Reply,
 * Send tracking) reach the reader here as well as by email, which until 1.8
 * was the only way they came. The order it is about is pinned under the
 * name, with its step lit (a reply with Send tracking carried the card in
 * its email; here the pinned order shows the same, and its page the
 * tracking). A ticket about an order is EIKON's; any other is Purify's.
 *
 * The reader answers through app/api/support/tickets/reply, which proves the
 * ticket is theirs and reopens it for the console, as an emailed answer does.
 */
export function TicketThread({ id }: { id: string }) {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(() => load(id), [id]);
  const thread = data && data.signedIn ? data.thread : null;
  const newest = thread?.messages[thread.messages.length - 1]?.created_at ?? null;

  // Opened here: its replies are read on this device (lib/shop/inbox.ts).
  useEffect(() => {
    if (thread && newest) markTicketSeen(thread.ticket.id, newest);
  }, [thread, newest]);

  if (loading && !data) return <ShopLoading label={t("shop.openingTheConversation")} />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title={t("shop.conversation")}
        body="Sign in to read this conversation and reply."
        next={`/shop/messages/detail?ticket=${id}`}
      />
    );
  }
  if (!thread || !data || !data.signedIn) return <ThreadNotFound />;

  const name = thread.ticket.order_id ? "EIKON" : "Purify";

  async function send(text: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await apiFetch("/api/support/tickets/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: thread!.ticket.id, body: text }),
      });
      const out = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && out.ok) {
        reload();
        return { ok: true };
      }
      return { ok: false, error: out.error ?? t("shop.messageSendFailed") };
    } catch {
      return { ok: false, error: t("shop.messageSendFailed") };
    }
  }

  return (
    <ThreadFrame current={`/shop/messages/detail?ticket=${thread.ticket.id}`} order={thread.order} now={data.now}>
      <ThreadHead name={name} seal line={t("shop.ticketAlsoEmailed")} />
      {thread.order ? (
        <div className="lg:hidden">
          <OrderPin order={thread.order} />
        </div>
      ) : (
        <p className="shop-raise mt-3 rounded-2xl px-3.5 py-3 font-sans text-ui font-semibold text-paper">
          {thread.ticket.subject}
          <span className="font-medium text-paper/50"> · {t("shop.inboxSupport")}</span>
        </p>
      )}
      <div className="mt-2">
        <TicketMessages thread={thread} name={name} />
        <Composer placeholder={t("shop.writeToPlaceholder", { name })} onSend={send} fixed />
        <TicketEnd count={thread.messages.length} />
      </div>
    </ThreadFrame>
  );
}

/** The ticket's messages: the reader's own on the right, the console's on the left with the seal. */
function TicketMessages({ thread, name }: { thread: TicketThreadData; name: string }) {
  const { t } = useTranslate();
  const messages = thread.messages;
  const [opened] = useState(() => new Set(messages.map((m) => m.id)));
  return (
    <ol aria-label={t("shop.messages")}>
      {messages.map((m, idx) => {
        const mine = m.author === "customer";
        const newDay = idx === 0 || dayKey(messages[idx - 1].created_at) !== dayKey(m.created_at);
        const lastOfRun = idx === messages.length - 1 || messages[idx + 1].author !== m.author;
        return (
          <Fragment key={m.id}>
            {newDay ? <DayRule iso={m.created_at} /> : null}
            <li
              className={cn(
                "mb-2.5 flex items-end gap-2",
                mine ? "justify-end" : "justify-start",
                !opened.has(m.id) && "shop-rise",
              )}
            >
              {!mine ? (
                lastOfRun ? (
                  <span className="mb-0.5">
                    <StoreAvatar name={name} seal size={28} />
                  </span>
                ) : (
                  <span aria-hidden className="w-7 shrink-0" />
                )
              ) : null}
              <div
                className={cn(
                  "max-w-[80%] rounded-[20px] px-3.5 pb-[9px] pt-[11px] md:max-w-[70%]",
                  mine ? "shop-bubble-me rounded-br-md text-paper" : "shop-raise rounded-bl-md text-paper/95",
                )}
              >
                <p className="whitespace-pre-wrap font-sans text-[15px] leading-[1.45]">{m.body}</p>
                <p className="mt-1 text-end font-sans text-[11px] text-paper/50">
                  {mine ? timeOf(m.created_at) : `${name} · ${timeOf(m.created_at)}`}
                </p>
              </div>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

/** The thread's end, brought into view on opening and on each new message (app/globals.css, .shop-thread-end). */
function TicketEnd({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [count]);
  return <div ref={ref} className="shop-thread-end" />;
}
