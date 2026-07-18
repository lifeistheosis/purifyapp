"use client";

import Link from "next/link";

import {
  ShopError,
  ShopListSkeleton,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import { cn } from "@/lib/cn";
import type { ShopConversation } from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_UNRESOLVED_MESSAGE,
  resolveUser,
} from "@/lib/supabase/resolveUser";

type Row = ShopConversation & { store: { public_name: string } | null };
type Result = { signedIn: false } | { signedIn: true; conversations: Row[] };

function unreadForBuyer(c: ShopConversation): boolean {
  if (!c.buyer_last_read_at) return true;
  return c.last_message_at > c.buyer_last_read_at;
}

async function load(): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const supabase = createClient();
  const { data } = await supabase
    .from("shop_conversations")
    .select("*, store:shop_stores(public_name)")
    .eq("buyer_user_id", auth.user.id)
    .order("last_message_at", { ascending: false })
    .limit(200);
  return { signedIn: true, conversations: (data ?? []) as Row[] };
}

export function MessagesClient() {
  const { data, error, loading, reload } = useAsyncData(load, []);

  if (loading) return <ShopListSkeleton />;
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
      <header className="flex flex-wrap items-end justify-between gap-4 pt-10 md:pt-14">
        <div>
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
            Purify Shop
          </p>
          <h1 className="mt-2 font-display-serif text-heading text-paper">
            Messages
          </h1>
        </div>
        <Link
          href="/shop/support"
          className="tap-press inline-flex min-h-[40px] items-center rounded-pill border border-gold/40 bg-gold/[0.08] px-4 font-sans text-detail font-semibold text-gold hover:bg-gold/[0.14]"
        >
          Contact EIKON support
        </Link>
      </header>

      {conversations.length === 0 ? (
        <div className="mt-8">
          <p className="font-serif text-body text-paper/65 leading-[1.65]">
            No conversations yet. Message EIKON support with any question, or
            reach a seller from any of your orders; replies land here.
          </p>
          <Link
            href="/shop/support"
            className="tap-press mt-5 inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90"
          >
            Contact EIKON support
          </Link>
        </div>
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
