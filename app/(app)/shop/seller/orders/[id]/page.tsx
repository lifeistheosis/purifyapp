import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RefundDecisionCard } from "@/components/shop/seller/RefundDecisionCard";
import { SellerOrderActions } from "@/components/shop/seller/SellerOrderActions";
import { formatPrice } from "@/lib/shop/format";
import { REFUND_STATUS_LABELS } from "@/lib/shop/refunds";
import { getSellerContext } from "@/lib/shop/seller";
import { getSellerOrder, listSellerRefunds } from "@/lib/shop/sellerData";
import { fulfillmentPathFor, statusLabelsFor } from "@/lib/shop/sellerOrders";

export const metadata: Metadata = { title: "Order" };

type ShippingAddress = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

/**
 * One order, everything the seller needs to act: items, money, the
 * buyer's shipping details, live actions, and any refund request. The
 * layout is a single calm column — a packing slip, not a spreadsheet.
 */
export default async function SellerOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null;

  const { id } = await params;
  const order = await getSellerOrder(ctx.seller.id, id);
  if (!order) notFound();

  const refunds = (await listSellerRefunds(ctx.seller.id)).filter(
    (r) => r.order.id === order.id,
  );
  const pendingRefund = refunds.find((r) => r.status === "requested");
  const settledRefunds = refunds.filter((r) => r.status !== "requested");

  // A CUSTOMER'S HOME ADDRESS, SHOWN TO A THIRD PARTY. Two rules.
  //
  // It is shown only while there is a reason to ship or to handle a return:
  // paid, refunded, or delivered. A CANCELLED order is nobody's to look at,
  // and a pending one has no address anyway (the Stripe webhook writes it with
  // the payment). The old page rendered the block for every state.
  //
  // And the disclosure is recorded. stdout is the sink, unconditionally and
  // first, exactly as lib/admin/activityLog.ts does it and for the same
  // reason: Render retains it, so "who saw that buyer's address" is answerable
  // with grep today rather than after a migration. It is deliberately NOT
  // admin_activity_log, which is scoped to admin actions; a seller reading
  // their own order is not an admin act and would drown that table.
  const showAddress =
    order.payment_status === "paid" || order.payment_status === "refunded";
  const address = showAddress
    ? ((order.shipping_address ?? null) as ShippingAddress | null)
    : null;
  if (address?.address) {
    console.log(
      JSON.stringify({
        tag: "seller-address-view",
        at: new Date().toISOString(),
        sellerId: ctx.seller.id,
        userId: ctx.userId,
        orderId: order.id,
      }),
    );
  }

  return (
    <div className="max-w-[760px] pb-16">
      <Link
        href="/shop/seller/orders"
        className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
      >
        ← Orders
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display-serif text-heading text-paper">
          {formatPrice(order.total_cents, order.currency)}
        </h1>
        <p className="inline-flex rounded-pill border border-paper/20 px-3 py-1 font-sans text-caption font-semibold text-paper/75">
          {statusLabelsFor(fulfillmentPathFor(ctx.seller.seller_type))[
            order.fulfillment_status
          ]}
          {order.payment_status !== "paid" ? ` · ${order.payment_status}` : ""}
        </p>
      </div>
      <p className="mt-1 font-sans text-caption text-paper/60">
        Placed{" "}
        {new Date(order.created_at).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}{" "}
        · Order {order.id.slice(0, 8)}
      </p>

      {pendingRefund ? (
        <div className="mt-6">
          <RefundDecisionCard
            refundId={pendingRefund.id}
            reason={pendingRefund.reason}
            details={pendingRefund.details}
            amountLabel={formatPrice(order.total_cents, order.currency)}
          />
        </div>
      ) : null}

      <section aria-label="Items" className="mt-6 rounded-lg border border-paper/10 bg-night-soft/60 p-5">
        <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-white/5">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-2.5">
              <p className="min-w-0 truncate font-sans text-ui text-paper">
                {item.title}
                {item.quantity > 1 ? (
                  <span className="text-paper/60"> × {item.quantity}</span>
                ) : null}
              </p>
              <p className="shrink-0 font-sans text-ui font-semibold text-paper">
                {formatPrice(item.unit_price_cents * item.quantity, order.currency)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-white/8 pt-3">
          <Row label="Items" value={formatPrice(order.items_total_cents, order.currency)} />
          <Row label="Shipping" value={formatPrice(order.shipping_cents, order.currency)} />
          {order.tax_cents > 0 ? (
            <Row label="Tax" value={formatPrice(order.tax_cents, order.currency)} />
          ) : null}
          <Row label="Total" value={formatPrice(order.total_cents, order.currency)} strong />
        </dl>
      </section>

      <section aria-label="Ship to" className="mt-5 rounded-lg border border-paper/10 bg-night-soft/60 p-5">
        <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
          Ship to
        </h2>
        {address?.address ? (
          <p className="mt-3 font-sans text-ui leading-relaxed text-paper">
            {address.name ? (
              <>
                {address.name}
                <br />
              </>
            ) : null}
            {address.address.line1}
            {address.address.line2 ? (
              <>
                <br />
                {address.address.line2}
              </>
            ) : null}
            <br />
            {[address.address.city, address.address.state, address.address.postal_code]
              .filter(Boolean)
              .join(", ")}
            <br />
            {address.address.country}
          </p>
        ) : (
          <p className="mt-3 font-serif text-body text-paper/60 leading-[1.6]">
            {order.payment_status === "pending"
              ? "No shipping address yet. It arrives with payment."
              : order.payment_status === "cancelled"
                ? "This order was cancelled, so there is nothing to ship and the buyer's address is not shown."
                : "No shipping address on this order."}
          </p>
        )}
        {address?.address ? (
          <p className="mt-3 font-sans text-caption text-paper/50 leading-[1.5]">
            Use this address only to fulfil and support this order. Do not add
            the buyer to a mailing list, contact them for marketing, or keep
            their details beyond your own tax and accounting obligations.
          </p>
        ) : null}
        {order.email ? (
          <p className="mt-3 font-sans text-detail text-paper/65">
            Buyer email: <span className="text-paper">{order.email}</span>
          </p>
        ) : null}
        {order.outbound_tracking ? (
          <p className="mt-2 font-sans text-detail text-paper/65">
            Tracking: <span className="text-paper">{order.outbound_tracking}</span>
          </p>
        ) : null}
      </section>

      {settledRefunds.length > 0 ? (
        <section aria-label="Refund history" className="mt-5 rounded-lg border border-paper/10 bg-night-soft/60 p-5">
          <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
            Refund history
          </h2>
          <ul className="mt-3 space-y-2">
            {settledRefunds.map((r) => (
              <li key={r.id} className="font-sans text-detail text-paper/70">
                {REFUND_STATUS_LABELS[r.status]}
                {r.amount_cents
                  ? ` · ${formatPrice(r.amount_cents, order.currency)}`
                  : ""}
                {r.resolution_note ? ` — ${r.resolution_note}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {order.payment_status === "paid" ? (
        <div className="mt-6">
          <SellerOrderActions
            orderId={order.id}
            fulfillmentStatus={order.fulfillment_status}
            paymentStatus={order.payment_status}
            tracking={order.outbound_tracking}
          />
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-sans text-ui font-semibold text-paper" : "font-sans text-detail text-paper/60"}>
        {label}
      </dt>
      <dd className={strong ? "font-sans text-ui font-semibold text-paper" : "font-sans text-detail text-paper/75"}>
        {value}
      </dd>
    </div>
  );
}
