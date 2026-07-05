import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MessageThread } from "@/components/shop/MessageThread";
import type { ShopConversation, ShopMessage } from "@/lib/shop/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Conversation" };

type Row = ShopConversation & { store: { public_name: string } | null };

export default async function BuyerConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[680px] px-5 pt-10 md:px-8 md:pt-14">
        <h1 className="font-display-serif text-heading text-paper">Conversation</h1>
        <Link
          href={`/signin?next=/shop/messages/${id}`}
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data } = await supabase
    .from("shop_conversations")
    .select("*, store:shop_stores(public_name)")
    .eq("id", id)
    .eq("buyer_user_id", user.id)
    .maybeSingle();
  const conv = data as Row | null;
  if (!conv) notFound();

  const { data: messages } = await supabase
    .from("shop_messages")
    .select("id, conversation_id, sender, body, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(500);

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
            href={`/shop/orders/${conv.order_id}`}
            className="mt-1 inline-block font-sans text-detail font-medium text-gold"
          >
            View the order →
          </Link>
        ) : null}
      </header>

      <div className="mt-6">
        <MessageThread
          conversationId={conv.id}
          messages={(messages ?? []) as ShopMessage[]}
          viewer="buyer"
          closed={conv.status === "closed"}
          counterpartyName={conv.store?.public_name ?? "Store"}
        />
      </div>
    </div>
  );
}
