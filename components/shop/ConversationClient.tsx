"use client";

import { useSearchParams } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { MessageThread } from "@/components/shop/MessageThread";
import { OrderPin } from "@/components/shop/OrderPin";
import { ShopError, ShopLoading, ShopSignInPrompt } from "@/components/shop/ShopStates";
import { ThreadFrame, ThreadHead, ThreadNotFound } from "@/components/shop/ThreadFrame";
import { TicketThread } from "@/components/shop/TicketThread";
import { readOrder, type BuyerOrder } from "@/lib/shop/buyerReads";
import { fetchThreadMessages } from "@/lib/shop/messages";
import type { ShopConversation, ShopMessage } from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import { AUTH_UNRESOLVED_MESSAGE, resolveUser } from "@/lib/supabase/resolveUser";

type Row = ShopConversation & { store: { public_name: string; slug: string | null } | null };
type Result =
  | { signedIn: false }
  | { signedIn: true; conversation: Row | null; messages: ShopMessage[]; order: BuyerOrder | null; now: number };

async function load(id: string): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const supabase = createClient();

  const { data } = await supabase
    .from("shop_conversations")
    .select("*, store:shop_stores(public_name, slug)")
    .eq("id", id)
    .eq("buyer_user_id", auth.user.id)
    .maybeSingle();
  const conversation = (data as Row | null) ?? null;
  if (!conversation) return { signedIn: true, conversation: null, messages: [], order: null, now: Date.now() };

  const [messages, order] = await Promise.all([
    fetchThreadMessages(supabase, conversation.id),
    conversation.order_id ? readOrder(supabase, conversation.order_id).catch(() => null) : Promise.resolve(null),
  ]);
  return { signedIn: true, conversation, messages, order, now: Date.now() };
}

/**
 * A thread, Messages A, "The order beside the thread" (r3-19, the owner's
 * pick of 2026-10-31). `?id=` is a conversation with a store: its seal or
 * initial and name, the order it is about pinned under them (its piece, its
 * number, its step lit; build 85 had a text link), then the thread.
 * `?ticket=` is one of the reader's support tickets, the console's replies
 * (TicketThread). Both are static routes that read their id on the device,
 * so they stay exportable for the apps.
 */
export function ConversationClient() {
  const params = useSearchParams();
  const ticket = params.get("ticket");
  if (ticket) return <TicketThread id={ticket} />;
  return <ConversationView id={params.get("id") ?? ""} />;
}

function ConversationView({ id }: { id: string }) {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(() => load(id), [id]);

  // Asking again after a send keeps the thread on screen, so the new message rises in.
  if (loading && !data) return <ShopLoading label={t("shop.openingTheConversation")} />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title={t("shop.conversation")}
        body="Sign in to read this conversation and reply."
        next={`/shop/messages/detail?id=${id}`}
      />
    );
  }
  if (!data || !data.conversation) return <ThreadNotFound />;

  const conv = data.conversation;
  const name = conv.store?.public_name ?? "EIKON";
  const seal = conv.store?.slug ? conv.store.slug === "eikon" : name === "EIKON";

  return (
    <ThreadFrame current={`/shop/messages/detail?id=${conv.id}`} order={data.order} now={data.now}>
      <ThreadHead name={name} seal={seal} line={seal ? t("shop.eikonOwnStore") : null} />
      {data.order ? (
        <div className="lg:hidden">
          <OrderPin order={data.order} />
        </div>
      ) : null}
      <div className="mt-2">
        <MessageThread
          conversationId={conv.id}
          messages={data.messages}
          viewer="buyer"
          closed={conv.status === "closed"}
          counterpartyName={name}
          counterpartySeal={seal}
          counterpartyLastReadAt={conv.seller_last_read_at}
          onSent={reload}
        />
      </div>
    </ThreadFrame>
  );
}
