"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BuyerMessageButton } from "@/components/shop/BuyerMessageButton";
import { BuyerRefundSection } from "@/components/shop/BuyerRefundSection";
import {
  ShopError,
  ShopLoading,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/shop/format";
import { canRequestRefund } from "@/lib/shop/refunds";
import {
  BUYER_ORDER_STEPS,
  buyerOrderStatus,
  buyerStepIndex,
} from "@/lib/shop/status";
import type {
  ShopOrder,
  ShopRefundRequest,
  ShopRefundStatus,
} from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_UNRESOLVED_MESSAGE,
  resolveUser,
} from "@/lib/supabase/resolveUser";

type OrderRow = ShopOrder & {
  user_id: string | null;
  store: { public_name: string } | null;
};

type LatestRefund = Pick<
  ShopRefundRequest,
  "id" | "status" | "reason" | "resolution_note" | "created_at"
> | null;

type Result =
  | { signedIn: false }
  | { signedIn: true; order: OrderRow | null; latestRefund: LatestRefund };

async function load(id: string): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const supabase = createClient();

  const { data } = await supabase
    .from("shop_orders")
    .select(
      "id, user_id, items_total_cents, shipping_cents, tax_cents, total_cents, currency, payment_status, fulfillment_status, outbound_tracking, created_at, items:shop_order_items(title, unit_price_cents, quantity), store:shop_stores(public_name)",
    )
    .eq("id", id)
    .maybeSingle();
  const order = (data as unknown as OrderRow | null) ?? null;
  if (!order) return { signedIn: true, order: null, latestRefund: null };

  const { data: refundRows } = await supabase
    .from("shop_refund_requests")
    .select("id, status, reason, resolution_note, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const latestRefund = (refundRows?.[0] as LatestRefund) ?? null;

  return { signedIn: true, order, latestRefund };
}

export function OrderDetailClient() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error, loading, reload } = useAsyncData(() => load(id), [id]);

  if (loading) return <ShopLoading label="Loading your order…" />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title="Your order"
        body="Sign in to see this order."
        next={`/shop/orders/detail?id=${id}`}
      />
    );
  }
  if (!data || !data.order) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
        <h1 className="font-display-serif text-heading text-paper">
          Order not found
        </h1>
        <Link
          href="/shop/orders"
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          Your orders
        </Link>
      </div>
    );
  }

  const { order, latestRefund } = data;
  const status = buyerOrderStatus(order);
  const step = buyerStepIndex(status);
  const storeName = order.store?.public_name ?? "the seller";

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-16 md:px-8">
      <header className="pt-10 md:pt-14">
        <Link
          href="/shop/orders"
          className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
        >
          ← Your orders
        </Link>
        <h1 className="mt-3 font-display-serif text-heading text-paper">
          {order.items.map((i) => i.title).join(", ")}
        </h1>
        <p className="mt-1 font-sans text-caption text-paper/60">
          Placed{" "}
          {new Date(order.created_at).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          · Sold by {storeName}
        </p>
      </header>

      <section
        aria-label="Order progress"
        className="mt-6 rounded-lg border border-paper/10 bg-night-soft/60 p-5"
      >
        {step >= 0 ? (
          <ol className="flex items-center gap-1">
            {BUYER_ORDER_STEPS.map((s, i) => (
              <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-full rounded-full",
                    i <= step ? "bg-gold" : "bg-paper/10",
                  )}
                />
                <span
                  className={cn(
                    "text-center font-sans text-[10px] leading-tight",
                    i === step ? "font-semibold text-paper" : "text-paper/60",
                  )}
                  aria-current={i === step ? "step" : undefined}
                >
                  {s}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="inline-flex rounded-pill border border-paper/20 px-3 py-1 font-sans text-caption font-semibold text-paper/70">
            {status}
          </p>
        )}
        {order.outbound_tracking ? (
          <p className="mt-4 font-sans text-detail text-paper/65">
            Tracking: <span className="text-paper">{order.outbound_tracking}</span>
          </p>
        ) : null}
      </section>

      <section
        aria-label="Items"
        className="mt-5 rounded-lg border border-paper/10 bg-night-soft/60 p-5"
      >
        <ul className="divide-y divide-white/5">
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
        <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
          <p className="font-sans text-ui font-semibold text-paper">Total</p>
          <p className="font-sans text-ui font-semibold text-paper">
            {formatPrice(order.total_cents, order.currency)}
          </p>
        </div>
      </section>

      <section aria-label="Message the seller" className="mt-5">
        <BuyerMessageButton
          orderId={order.id}
          storeName={storeName}
          subject={`Order · ${order.items[0]?.title ?? order.id.slice(0, 8)}`}
        />
      </section>

      <section aria-label="Refunds" className="mt-5">
        <BuyerRefundSection
          orderId={order.id}
          eligible={canRequestRefund(
            order.payment_status,
            latestRefund &&
              (latestRefund.status === "requested" ||
                latestRefund.status === "approved")
              ? (latestRefund.status as ShopRefundStatus)
              : null,
          )}
          latest={latestRefund}
          onChanged={reload}
        />
      </section>
    </div>
  );
}
