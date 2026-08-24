import type { Metadata } from "next";
import Link from "next/link";

import { formatPrice } from "@/lib/shop/format";
import { REFUND_STATUS_LABELS, refundIsActive } from "@/lib/shop/refunds";
import { getSellerContext } from "@/lib/shop/seller";
import { listSellerOrders, listSellerRefunds } from "@/lib/shop/sellerData";
import {
  needsSellerAction,
  fulfillmentPathFor,
  statusLabelsFor,
} from "@/lib/shop/sellerOrders";
import type { ShopSellerOrder } from "@/lib/shop/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Orders" };

/**
 * All orders, grouped by what they ask of the seller: needs action,
 * in motion, done. Unpaid checkouts sit in their own quiet section —
 * they may still complete, but nothing should be shipped against them.
 * Open refund requests surface at the top; money questions come first.
 */
export default async function SellerOrdersPage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null;

  const [orders, refunds] = await Promise.all([
    listSellerOrders(ctx.seller.id),
    listSellerRefunds(ctx.seller.id),
  ]);

  // EIKON's sourcing and inspection stages describe a warehouse an independent
  // seller has never seen; statusLabelsFor names the states for whoever is
  // actually shipping. See lib/shop/sellerOrders.ts.
  const statusLabels = statusLabelsFor(
    fulfillmentPathFor(ctx.seller.seller_type),
  );

  const openRefunds = refunds.filter((r) => refundIsActive(r.status));
  const paid = orders.filter((o) => o.payment_status === "paid");
  const needsAction = paid.filter((o) => needsSellerAction(o.fulfillment_status));
  const inMotion = paid.filter(
    (o) =>
      !needsSellerAction(o.fulfillment_status) &&
      o.fulfillment_status !== "delivered",
  );
  const done = orders.filter(
    (o) =>
      o.fulfillment_status === "delivered" ||
      o.payment_status === "refunded" ||
      o.payment_status === "cancelled",
  );
  const awaitingPayment = orders.filter((o) => o.payment_status === "pending");

  return (
    <div className="pb-16">
      <h1 className="font-display-serif text-heading text-paper">Orders</h1>

      {openRefunds.length > 0 ? (
        <section
          id="refunds"
          aria-label="Open refund requests"
          className="mt-6 rounded-lg border border-crimson-soft/40 bg-crimson-soft/[0.06] p-5"
        >
          <h2 className="font-sans text-ui font-semibold text-paper">
            Refund requests waiting on you
          </h2>
          <ul className="mt-3 space-y-2">
            {openRefunds.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/shop/seller/orders/${r.order.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-paper/10 bg-night px-4 py-3"
                >
                  <span className="min-w-0 truncate font-sans text-detail text-paper">
                    {r.order.items.map((i) => i.title).join(", ")}
                  </span>
                  <span className="shrink-0 font-sans text-caption font-semibold text-paper/70">
                    {REFUND_STATUS_LABELS[r.status]} ·{" "}
                    {formatPrice(r.order.total_cents, r.order.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <OrderSection
        statusLabels={statusLabels}
        title="Needs action"
        emptyCopy="No paid orders are waiting on you."
        orders={needsAction}
        highlight
      />
      <OrderSection
        statusLabels={statusLabels}
        title="In motion"
        emptyCopy="Nothing is currently shipping."
        orders={inMotion}
      />
      <OrderSection
        statusLabels={statusLabels}
        title="Awaiting payment"
        emptyCopy="No checkouts are pending payment."
        orders={awaitingPayment}
        muted
      />
      <OrderSection
        statusLabels={statusLabels}
        title="Completed"
        emptyCopy="Delivered, refunded, and cancelled orders will collect here."
        orders={done}
        muted
      />
    </div>
  );
}

function OrderSection({
  title,
  emptyCopy,
  orders,
  statusLabels,
  highlight,
  muted,
}: {
  title: string;
  emptyCopy: string;
  orders: ShopSellerOrder[];
  /** Named for whoever actually ships; see lib/shop/sellerOrders.ts. */
  statusLabels: Record<ShopSellerOrder["fulfillment_status"], string>;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="font-display-serif text-title text-paper">
        {title}
        <span className="ml-2 font-sans text-detail text-paper/50">
          {orders.length}
        </span>
      </h2>
      {orders.length === 0 ? (
        <p className="mt-3 font-serif text-body text-paper/60 leading-[1.6]">
          {emptyCopy}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/shop/seller/orders/${o.id}`}
                className={cn(
                  "press-card flex items-center justify-between gap-4 rounded-lg border p-4",
                  highlight
                    ? "border-gold/35 bg-gold/[0.05]"
                    : "border-paper/10 bg-night-soft/60",
                  muted && "opacity-80",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-sans text-ui font-semibold text-paper">
                    {o.items.map((i) => i.title).join(", ") || "Order"}
                  </p>
                  <p className="mt-1 font-sans text-caption text-paper/60">
                    <span
                      className={cn(
                        "mr-2 inline-flex rounded-pill border border-paper/20 px-2 py-0.5 font-semibold",
                        highlight ? "text-gold" : "text-paper/70",
                      )}
                    >
                      {statusLabels[o.fulfillment_status]}
                    </span>
                    Placed{" "}
                    {new Date(o.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {o.email ? <> · {o.email}</> : null}
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
  );
}
