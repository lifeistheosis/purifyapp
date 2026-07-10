import type { Metadata } from "next";
import Link from "next/link";

import { getSellerContext } from "@/lib/shop/seller";
import {
  conversationUnreadForSeller,
  listSellerConversations,
} from "@/lib/shop/sellerData";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Messages" };

/**
 * The seller's inbox. Unread threads carry a gold dot and sort first
 * inside the recency order the query already provides. Buyers are shown
 * as "Customer" — names arrive with orders, not with messages, and the
 * console shouldn't pretend otherwise.
 */
export default async function SellerMessagesPage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null;

  const conversations = await listSellerConversations(ctx.seller.id);

  return (
    <div className="max-w-[760px] pb-16">
      <h1 className="font-display-serif text-heading text-paper">Messages</h1>

      {conversations.length === 0 ? (
        <p className="mt-4 font-serif text-body text-paper/65 leading-[1.65]">
          No conversations yet. When a customer writes about an order or a
          listing, the thread appears here.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {conversations.map((c) => {
            const unread = conversationUnreadForSeller(c);
            return (
              <li key={c.id}>
                <Link
                  href={`/shop/seller/messages/${c.id}`}
                  className={cn(
                    "press-card flex items-center gap-4 rounded-lg border p-4",
                    unread
                      ? "border-gold/35 bg-gold/[0.05]"
                      : "border-paper/10 bg-night-soft/60",
                  )}
                >
                  {unread ? (
                    <span
                      aria-label="Unread"
                      className="h-2.5 w-2.5 shrink-0 rounded-full bg-gold"
                    />
                  ) : (
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate font-sans text-ui text-paper",
                        unread ? "font-semibold" : "font-medium",
                      )}
                    >
                      {c.subject}
                    </p>
                    <p className="mt-0.5 font-sans text-caption text-paper/55">
                      {c.order_id ? "About an order" : "General"} ·{" "}
                      {new Date(c.last_message_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      {c.status === "closed" ? " · Closed" : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
