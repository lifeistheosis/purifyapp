import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MessageThread } from "@/components/shop/MessageThread";
import { fetchThreadMessages } from "@/lib/shop/messages";
import { getSellerContext } from "@/lib/shop/seller";
import { createClient } from "@/lib/supabase/server";
import type { ShopConversation } from "@/lib/shop/types";

export const metadata: Metadata = { title: "Conversation" };

export default async function SellerConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null;

  const { id } = await params;
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("shop_conversations")
    .select("*")
    .eq("id", id)
    .eq("seller_id", ctx.seller.id)
    .maybeSingle();
  if (!conversation) notFound();
  const conv = conversation as ShopConversation;

  const messages = await fetchThreadMessages(supabase, conv.id);

  return (
    <div className="max-w-[760px] pb-16">
      <Link
        href="/shop/seller/messages"
        className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
      >
        ← Messages
      </Link>
      <h1 className="mt-3 font-display-serif text-title text-paper">
        {conv.subject}
      </h1>
      {conv.order_id ? (
        <Link
          href={`/shop/seller/orders/${conv.order_id}`}
          className="mt-1 inline-block font-sans text-detail font-medium text-gold"
        >
          View the order →
        </Link>
      ) : null}

      <div className="mt-6">
        <MessageThread
          conversationId={conv.id}
          messages={messages}
          viewer="seller"
          closed={conv.status === "closed"}
          counterpartyName="Customer"
          counterpartyLastReadAt={conv.buyer_last_read_at}
        />
      </div>
    </div>
  );
}
