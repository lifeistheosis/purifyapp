"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { MessageThread } from "@/components/shop/MessageThread";
import {
  ShopError,
  ShopLoading,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import type { ShopConversation, ShopMessage } from "@/lib/shop/types";
import { fetchThreadMessages } from "@/lib/shop/messages";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_UNRESOLVED_MESSAGE,
  resolveUser,
} from "@/lib/supabase/resolveUser";

type Row = ShopConversation & { store: { public_name: string } | null };
type Result =
  | { signedIn: false }
  | { signedIn: true; conversation: Row | null; messages: ShopMessage[] };

async function load(id: string): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const supabase = createClient();

  const { data } = await supabase
    .from("shop_conversations")
    .select("*, store:shop_stores(public_name)")
    .eq("id", id)
    .eq("buyer_user_id", auth.user.id)
    .maybeSingle();
  const conversation = (data as Row | null) ?? null;
  if (!conversation) return { signedIn: true, conversation: null, messages: [] };

  const messages = await fetchThreadMessages(supabase, conversation.id);

  return {
    signedIn: true,
    conversation,
    messages,
  };
}

export function ConversationClient() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error, loading, reload } = useAsyncData(() => load(id), [id]);

  if (loading) return <ShopLoading label="Opening the conversation…" />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title="Conversation"
        body="Sign in to read this conversation and reply."
        next={`/shop/messages/detail?id=${id}`}
      />
    );
  }
  if (!data || !data.conversation) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
        <h1 className="font-display-serif text-heading text-paper">
          Conversation not found
        </h1>
        <Link
          href="/shop/messages"
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          Messages
        </Link>
      </div>
    );
  }

  const conv = data.conversation;

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-16 md:px-8">
      <header className="pt-10 md:pt-14">
        <Link
          href="/shop/messages"
          className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
        >
          ← Messages
        </Link>
        <h1 className="mt-3 font-display-serif text-title text-paper">
          {conv.subject}
        </h1>
        {conv.order_id ? (
          <Link
            href={`/shop/orders/detail?id=${conv.order_id}`}
            className="mt-1 inline-block font-sans text-detail font-medium text-gold"
          >
            View the order →
          </Link>
        ) : null}
      </header>

      <div className="mt-6">
        <MessageThread
          conversationId={conv.id}
          messages={data.messages}
          viewer="buyer"
          closed={conv.status === "closed"}
          counterpartyName={conv.store?.public_name ?? "Store"}
          counterpartyLastReadAt={conv.seller_last_read_at}
          onSent={reload}
        />
      </div>
    </div>
  );
}
