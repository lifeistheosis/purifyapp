"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BuyerMessageButton } from "@/components/shop/BuyerMessageButton";
import { BuyerRefundSection } from "@/components/shop/BuyerRefundSection";
import { OrderProgress } from "@/components/shop/OrderProgress";
import {
  ShopError,
  ShopLoading,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import { useIsNative } from "@/lib/platform/native";
import { formatPrice } from "@/lib/shop/format";
import { productHref } from "@/lib/shop/productHref";
import { canRequestRefund } from "@/lib/shop/refunds";
import { buyerOrderStatus } from "@/lib/shop/status";
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
import { useTranslate } from "@/components/i18n/MessagesProvider";

type OrderItem = {
  title: string;
  unit_price_cents: number;
  quantity: number;
  // Joined so a paid order can offer a "write a review" link per item, and
  // so the tracker can estimate a ship date from the listing's promised
  // dispatch window. Null when the product was removed since purchase.
  product: {
    slug: string;
    dispatch_min_days: number | null;
    dispatch_max_days: number | null;
  } | null;
};

type OrderRow = Omit<ShopOrder, "items"> & {
  user_id: string | null;
  updated_at: string | null;
  items: OrderItem[];
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
      "id, user_id, items_total_cents, shipping_cents, tax_cents, total_cents, currency, payment_status, fulfillment_status, outbound_tracking, created_at, updated_at, items:shop_order_items(title, unit_price_cents, quantity, product:shop_products(slug, dispatch_min_days, dispatch_max_days)), store:shop_stores(public_name)",
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
  const { t } = useTranslate();
  const native = useIsNative();
  const id = useSearchParams().get("id") ?? "";
  const { data, error, loading, reload } = useAsyncData(() => load(id), [id]);

  if (loading) return <ShopLoading label={t("shop.loadingYourOrder")} />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title={t("shop.yourOrder")}
        body="Sign in to see this order."
        next={`/shop/orders/detail?id=${id}`}
      />
    );
  }
  if (!data || !data.order) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
        <h1 className="font-display-serif text-heading text-paper">
          {t("shop.orderNotFound")}
        </h1>
        <Link
          href="/shop/orders"
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          {t("shop.yourOrders")}
        </Link>
      </div>
    );
  }

  const { order, latestRefund } = data;
  const status = buyerOrderStatus(order);
  const storeName = order.store?.public_name ?? "the seller";

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-16 md:px-8">
      <header className="pt-10 md:pt-14">
        <Link
          href="/shop/orders"
          className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
        >
          {t("shop.yourOrdersX")}
        </Link>
        <h1 className="mt-3 font-display-serif text-heading text-paper">
          {order.items.map((i) => i.title).join(", ")}
        </h1>
        <p className="mt-1 font-sans text-caption text-paper/60">
          {t("shop.placed")}{" "}
          {new Date(order.created_at).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          {t("shop.soldBy")} {storeName}
        </p>
      </header>

      <OrderProgress
        status={status}
        placedAt={order.created_at}
        updatedAt={order.updated_at}
        items={order.items.map((i) => i.product)}
        tracking={order.outbound_tracking}
      />

      <section
        aria-label={t("shop.items")}
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
          <p className="font-sans text-ui font-semibold text-paper">{t("shop.total")}</p>
          <p className="font-sans text-ui font-semibold text-paper">
            {formatPrice(order.total_cents, order.currency)}
          </p>
        </div>
      </section>

      {/* Post-purchase review request: once the order is paid the buyer is a
          verified purchaser, so invite an honest review per item. Links to the
          product's reviews, where the verified-buyer form already lives. */}
      {order.payment_status === "paid" &&
      order.items.some((item) => item.product?.slug) ? (
        <section
          aria-label={t("shop.reviewYourPurchase")}
          className="mt-5 rounded-lg border border-paper/10 bg-night-soft/60 p-5"
        >
          <h2 className="font-sans text-ui font-semibold text-paper">
            {t("shop.enjoyingYour")} {order.items.length > 1 ? "icons" : "icon"}?
          </h2>
          <p className="mt-1 font-sans text-caption text-paper/55">
            {t("shop.shareAnHonestReviewTo")}
          </p>
          <ul className="mt-3.5 space-y-2.5">
            {order.items.map((item, i) =>
              item.product?.slug ? (
                <li key={i} className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-sans text-detail text-paper/80">
                    {item.title}
                  </p>
                  <Link
                    href={productHref(item.product.slug, native, "#reviews")}
                    className="tap-press shrink-0 inline-flex items-center rounded-pill border border-paper/25 px-4 py-1.5 font-sans text-detail font-semibold text-paper hover:border-paper/45"
                  >
                    {t("shop.writeAReview")}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      ) : null}

      <section aria-label={t("shop.messageTheSeller")} className="mt-5">
        <BuyerMessageButton
          orderId={order.id}
          storeName={storeName}
          subject={`Order · ${order.items[0]?.title ?? order.id.slice(0, 8)}`}
        />
      </section>

      <section aria-label={t("shop.refunds")} className="mt-5">
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
