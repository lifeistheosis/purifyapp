"use client";

import Link from "next/link";

import {
  ShopError,
  ShopLoading,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import { cn } from "@/lib/cn";
import type { ShopConversation } from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";

type Row = ShopConversation & { store: { public_name: string } | null };
type Result = { signedIn: false } | { signedIn: true; conversations: Row[] };

function unreadForBuyer(c: ShopConversation): boolean {
  if (!c.buyer_last_read_at) return true;
  return c.last_message_at > c.buyer_last_read_at;
}

async function load(): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false };
  const { data } = await supabase
    .from("shop_conversations")
    .select("*, store:shop_stores(public_name)")
    .eq("buyer_user_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(200);
  return { signedIn: true, conversations: (data ?? []) as Row[] };
}

export function MessagesClient() {
  const { data, error, loading, reload } = useAsyncData(load, []);

  if (loading) return <ShopLoading label="Loading your messages…" />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title="Messages"
        body="Sign in to message sellers and read their replies."
        next="/shop/messages"
      />
    );
  }

  const conversations = data && data.signedIn ? data.conversations : [];

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
                  href={`/shop/messages/detail?id=${c.id}`}
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
