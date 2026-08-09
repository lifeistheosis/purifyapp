import type { Metadata } from "next";
import Link from "next/link";

import { earningsSummary } from "@/lib/shop/earnings";
import { formatPrice } from "@/lib/shop/format";
import { refundIsActive } from "@/lib/shop/refunds";
import { getSellerContext } from "@/lib/shop/seller";
import {
  conversationUnreadForSeller,
  listSellerConversations,
  listSellerOrders,
  listSellerRefunds,
} from "@/lib/shop/sellerData";
import {
  needsSellerAction,
  SELLER_STATUS_LABELS,
} from "@/lib/shop/sellerOrders";

export const metadata: Metadata = { title: "Overview" };

/**
 * The morning-coffee page: what needs me, how is the store doing. Four
 * stat cards, then the orders that actually need a hand. The store
 * setup notice appears while the store is still draft/paused so a new
 * seller always knows why buyers can't see them yet.
 */
export default async function SellerOverviewPage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null; // layout already gated

  const [orders, conversations, refunds] = await Promise.all([
    listSellerOrders(ctx.seller.id),
    listSellerConversations(ctx.seller.id),
    listSellerRefunds(ctx.seller.id),
  ]);

  const summary = earningsSummary(orders);
  const actionable = orders.filter(
    (o) => o.payment_status === "paid" && needsSellerAction(o.fulfillment_status),
  );
  const unread = conversations.filter(conversationUnreadForSeller).length;
  const openRefunds = refunds.filter((r) => refundIsActive(r.status)).length;

  const cards = [
    {
      label: "Net earnings",
      value: formatPrice(summary.netCents),
      href: "/shop/seller/earnings",
    },
    {
      label: "Orders to fulfill",
      value: String(actionable.length),
      href: "/shop/seller/orders",
    },
    {
      label: "Unread messages",
      value: String(unread),
      href: "/shop/seller/messages",
    },
    {
      label: "Open refund requests",
      value: String(openRefunds),
      href: "/shop/seller/orders#refunds",
    },
  ];

  return (
    <div className="pb-16">
      <h1 className="font-display-serif text-heading text-paper">
        Welcome back
        {ctx.store ? (
          <span className="text-paper/60">, {ctx.store.public_name}</span>
        ) : null}
      </h1>

      {ctx.store && ctx.store.status !== "live" ? (
        <div className="mt-5 rounded-lg border border-gold/30 bg-gold/[0.06] p-5">
          <p className="font-sans text-ui font-semibold text-paper">
            Your store isn&rsquo;t live yet.
          </p>
          <p className="mt-1.5 font-serif text-body text-paper/70 leading-[1.6]">
            Buyers can&rsquo;t see your storefront or listings while it&rsquo;s
            in &ldquo;{ctx.store.status}&rdquo;. Finish your listings, then
            write to lifeistheosis@gmail.com to schedule the review that flips it
            live.
          </p>
        </div>
      ) : null}
      {!ctx.store ? (
        <div className="mt-5 rounded-lg border border-gold/30 bg-gold/[0.06] p-5">
          <p className="font-sans text-ui font-semibold text-paper">
            Your store is being prepared.
          </p>
          <p className="mt-1.5 font-serif text-body text-paper/70 leading-[1.6]">
            Your seller account is active but the storefront hasn&rsquo;t been
            created yet. The Purify team is on it.
          </p>
        </div>
      ) : null}

      <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link
              href={c.href}
              className="press-card block rounded-lg border border-paper/10 bg-night-soft/60 p-5"
            >
              <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
                {c.label}
              </p>
              <p className="mt-2 font-display-serif text-heading text-paper">
                {c.value}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-label="Orders that need you" className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display-serif text-title text-paper">
            Needs your attention
          </h2>
          <Link
            href="/shop/seller/orders"
            className="font-sans text-detail font-medium text-gold"
          >
            All orders →
          </Link>
        </div>

        {actionable.length === 0 ? (
          <p className="mt-4 font-serif text-body text-paper/65 leading-[1.65]">
            Nothing waiting on you. New paid orders appear here the moment they
            arrive.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {actionable.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/shop/seller/orders/${o.id}`}
                  className="press-card flex items-center justify-between gap-4 rounded-lg border border-paper/10 bg-night-soft/60 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-sans text-ui font-semibold text-paper">
                      {o.items.map((i) => i.title).join(", ")}
                    </p>
                    <p className="mt-1 font-sans text-caption text-paper/60">
                      {SELLER_STATUS_LABELS[o.fulfillment_status]} ·{" "}
                      {new Date(o.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="shrink-0 font-sans text-ui font-semibold text-paper">
                    {formatPrice(o.total_cents, o.currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
