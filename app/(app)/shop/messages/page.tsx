import type { Metadata } from "next";
import Link from "next/link";

import type { ShopConversation } from "@/lib/shop/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Messages" };

type Row = ShopConversation & { store: { public_name: string } | null };

function unreadForBuyer(c: ShopConversation): boolean {
  if (!c.buyer_last_read_at) return true;
  return c.last_message_at > c.buyer_last_read_at;
}

/** The buyer's inbox: every thread they've opened with a store. */
export default async function BuyerMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[680px] px-5 pt-10 md:px-8 md:pt-14">
        <h1 className="font-display-serif text-heading text-paper">Messages</h1>
        <p className="mt-4 font-serif text-body text-paper/70 leading-[1.65]">
          Sign in to message sellers and read their replies.
        </p>
        <Link
          href="/signin?next=/shop/messages"
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
    .eq("buyer_user_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(200);
  const conversations = (data ?? []) as Row[];

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-16 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          Purify Shop
        </p>
        <h1 className="mt-2 font-display-serif text-heading text-paper">
          Messages
        </h1>
      </header>

      {conversations.length === 0 ? (
        <p className="mt-8 font-serif text-body text-paper/65 leading-[1.65]">
          No conversations yet. You can message a seller from any of your
          orders; replies land here.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {conversations.map((c) => {
            const unread = unreadForBuyer(c);
            return (
              <li key={c.id}>
                <Link
                  href={`/shop/messages/${c.id}`}
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
                      {c.store?.public_name ?? "Store"} ·{" "}
                      {new Date(c.last_message_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
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
