"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { BuyerMessageButton } from "@/components/shop/BuyerMessageButton";
import { BuyerRefundSection } from "@/components/shop/BuyerRefundSection";
import { OrderStory } from "@/components/shop/OrderStory";
import { OrdersList } from "@/components/shop/OrdersClient";
import { OrderPieces, PiecePhoto } from "@/components/shop/PiecePhoto";
import { HelpGlyph, ReturnsGlyph } from "@/components/shop/shopGlyphs";
import { ShopError, ShopLoading, ShopSignInPrompt } from "@/components/shop/ShopStates";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { cn } from "@/lib/cn";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";
import { useIsNative } from "@/lib/platform/native";
import { readOrder, readOrders, type BuyerOrder } from "@/lib/shop/buyerReads";
import { formatPrice } from "@/lib/shop/format";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { asksForReview, orderLines, orderTitle, piecePhoto, shipToLines } from "@/lib/shop/orderStory";
import { productHref } from "@/lib/shop/productHref";
import { canRequestRefund } from "@/lib/shop/refunds";
import type { ShopRefundRequest, ShopRefundStatus } from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { useWide } from "@/lib/shop/useWide";
import { createClient } from "@/lib/supabase/client";
import { AUTH_UNRESOLVED_MESSAGE, resolveUser } from "@/lib/supabase/resolveUser";

type LatestRefund = Pick<ShopRefundRequest, "id" | "status" | "reason" | "resolution_note" | "created_at"> | null;

type Result =
  | { signedIn: false }
  | { signedIn: true; order: BuyerOrder | null; latestRefund: LatestRefund; now: number };

async function load(id: string): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const supabase = createClient();
  const order = await readOrder(supabase, id);
  if (!order) return { signedIn: true, order: null, latestRefund: null, now: Date.now() };
  const { data: refundRows } = await supabase
    .from("shop_refund_requests")
    .select("id, status, reason, resolution_note, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1);
  return { signedIn: true, order, latestRefund: (refundRows?.[0] as LatestRefund) ?? null, now: Date.now() };
}

/** The reader's other orders, for the rail beside the open one on a wide window. */
async function loadRail(wide: boolean): Promise<{ orders: BuyerOrder[]; now: number } | null> {
  if (!wide) return null;
  const auth = await resolveUser();
  if (auth.state !== "signed-in") return null;
  return { orders: await readOrders(createClient()), now: Date.now() };
}

/**
 * An order's page, Orders B, "The whole story" (r3-19, the owner's pick of
 * 2026-10-31): the piece, the order's EIK number (the one support and the
 * console go by; build 85 showed it on neither order page), the story of its
 * five steps (OrderStory), and three tiles: Message the store, Something
 * wrong, Returns. Then the parcel's list with a shipping line in the total,
 * where it goes, and, once it has arrived and never before, the review ask.
 *
 * At the website's width the reader's orders stand beside the open one, and
 * the story beside the parcel, the money and the address.
 *
 * The page reads the reader's own rows on the device under RLS; Message and
 * Something wrong write through the authenticated routes they always used.
 */
export function OrderDetailClient() {
  const { t } = useTranslate();
  const id = useSearchParams().get("id") ?? "";
  const { data, error, loading, reload } = useAsyncData(() => load(id), [id]);
  const wide = useWide();
  const rail = useAsyncData(() => loadRail(wide), [wide]);

  // Asking again after a refund request keeps the order on screen.
  if (loading && !data) return <ShopLoading label={t("shop.loadingYourOrder")} />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title={t("shop.yourOrder")}
        body={t("shop.signInToSeeOrders")}
        next={`/shop/orders/detail?id=${id}`}
      />
    );
  }
  if (!data || !data.order) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
        <h1 className="font-heading text-[28px] font-semibold text-paper">{t("shop.orderNotFound")}</h1>
        <Link
          href="/shop/orders"
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          {t("shop.yourOrders")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-12 md:px-8 lg:grid lg:max-w-[1200px] lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:pt-10">
      {wide && rail.data ? (
        <aside className="hidden lg:block" aria-label={t("shop.yourOrders")}>
          <p className="mb-4 font-heading text-[26px] font-semibold leading-tight text-paper">{t("shop.yourOrders")}</p>
          <OrdersList orders={rail.data.orders} now={rail.data.now} rail currentId={data.order.id} />
        </aside>
      ) : null}
      <OrderPage order={data.order} latestRefund={data.latestRefund} now={data.now} onChanged={reload} />
    </div>
  );
}

function OrderPage({
  order,
  latestRefund,
  now,
  onChanged,
}: {
  order: BuyerOrder;
  latestRefund: LatestRefund;
  now: number;
  onChanged: () => void;
}) {
  const { t, tn } = useTranslate();
  const native = useIsNative();
  const [panel, setPanel] = useState<"message" | "refund" | null>(null);
  const storeName = order.store?.public_name ?? "EIKON";
  const { first, more } = orderTitle(order.items);
  const placed = new Date(order.created_at).toLocaleDateString(deviceDateLocale(), {
    month: "short",
    day: "numeric",
  });
  // A refund already asked for (or settled) shows its own card; a new one is asked through the tile.
  const refundCard = Boolean(latestRefund && latestRefund.status !== "cancelled");
  const canAsk =
    !refundCard &&
    canRequestRefund(
      order.payment_status,
      latestRefund && (latestRefund.status === "requested" || latestRefund.status === "approved")
        ? (latestRefund.status as ShopRefundStatus)
        : null,
    );
  const address = shipToLines(order.shipping_address);
  const reviewable = asksForReview(order) ? order.items.filter((i) => i.product?.slug) : [];
  const toggle = (p: "message" | "refund") => setPanel((cur) => (cur === p ? null : p));

  return (
    <article className="min-w-0">
      <header className="flex items-start gap-3.5 pt-5 md:pt-10 lg:pt-0">
        <OrderPieces items={order.items} width={order.items.length > 1 ? 60 : 70} height={88} rounded="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[11.5px] font-medium tracking-[0.06em] tabular-nums text-paper/50">
            {orderConfirmationNumber(order.id)}
          </p>
          <h1 className="mt-0.5 font-heading text-[23px] font-semibold leading-[1.18] text-paper">
            {first}
            {more ? <span className="font-medium text-paper/60"> {tn("shop.andMore", more)}</span> : null}
          </h1>
          <p className="mt-1 font-sans text-[12.5px] text-paper/60">
            {t("shop.placed")} {placed} · {formatPrice(order.total_cents, order.currency)} · {storeName}
          </p>
        </div>
      </header>

      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div>
          <OrderStory order={order} now={new Date(now)} />

          <div className={cn("mt-3.5 grid gap-2.5", canAsk ? "grid-cols-3" : "grid-cols-2")}>
            <Tile icon={<ChatBubble size={20} />} pressed={panel === "message"} onClick={() => toggle("message")}>
              {t("shop.message")} {storeName}
            </Tile>
            {canAsk ? (
              <Tile icon={<HelpGlyph size={20} />} pressed={panel === "refund"} onClick={() => toggle("refund")}>
                {t("shop.somethingWrong")}
              </Tile>
            ) : null}
            <Link
              href="/shop/policies#returns"
              className="shop-raise tap-press flex min-h-[74px] flex-col items-center justify-center gap-[7px] rounded-2xl px-1.5 text-center font-sans text-[12.5px] font-semibold leading-tight text-paper/90"
            >
              <ReturnsGlyph size={20} />
              {t("shop.returns")}
            </Link>
          </div>

          {panel === "message" ? (
            <div className="mt-3">
              <BuyerMessageButton
                orderId={order.id}
                storeName={storeName}
                subject={`Order · ${first || order.id.slice(0, 8)}`}
                startOpen
                onCancel={() => setPanel(null)}
              />
            </div>
          ) : null}
          {panel === "refund" && canAsk ? (
            <div className="mt-3">
              <BuyerRefundSection
                orderId={order.id}
                eligible
                latest={latestRefund}
                onChanged={onChanged}
                startOpen
                hideIntro
                onCancel={() => setPanel(null)}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 lg:mt-0">
          <Parcel order={order} />

          {address.length ? (
            <section aria-label={t("shop.shipTo")} className="mt-5">
              <p className="mb-2 px-1 font-sans text-[13px] font-semibold text-paper/60">{t("shop.shipTo")}</p>
              <p className="px-1 font-sans text-[13.5px] leading-relaxed text-paper/80">
                {address.map((l, i) => (
                  <span key={i} className="block">
                    {l}
                  </span>
                ))}
              </p>
            </section>
          ) : null}

          {reviewable.length ? (
            <section aria-label={t("shop.reviewYourPurchase")} className="shop-raise mt-5 rounded-[18px] p-4">
              <h2 className="font-heading text-[17px] font-semibold text-paper">{t("shop.reviewYourPurchase")}</h2>
              <p className="mt-1 font-sans text-caption text-paper/55">{t("shop.shareAnHonestReviewTo")}</p>
              <ul className="mt-3 space-y-2.5">
                {reviewable.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate font-sans text-detail text-paper/80">{item.title}</p>
                    <Link
                      href={productHref(item.product!.slug, native, "#reviews")}
                      className="shop-knob tap-press inline-flex min-h-11 shrink-0 items-center rounded-pill px-4 font-sans text-detail font-semibold text-paper"
                    >
                      {t("shop.writeAReview")}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {refundCard ? (
            <section aria-label={t("shop.refunds")} className="mt-5">
              <BuyerRefundSection orderId={order.id} eligible={false} latest={latestRefund} onChanged={onChanged} />
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** One of the order's three tiles: a raised square with its drawing and its word. */
function Tile({
  icon,
  pressed,
  onClick,
  children,
}: {
  icon: ReactNode;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-expanded={pressed}
      onClick={onClick}
      className={cn(
        "shop-raise tap-press flex min-h-[74px] flex-col items-center justify-center gap-[7px] rounded-2xl px-1.5 text-center font-sans text-[12.5px] font-semibold leading-tight",
        pressed ? "text-paper ring-1 ring-paper/50" : "text-paper/90",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** The parcel's list: each piece with its photo, a shipping line always, tax when any, the total. */
function Parcel({ order }: { order: BuyerOrder }) {
  const { t } = useTranslate();
  const price = (c: number) => formatPrice(c, order.currency);
  return (
    <section aria-label={t("shop.items")}>
      <p className="mb-2 px-1 font-sans text-[13px] font-semibold text-paper/60">{t("shop.items")}</p>
      <ul className="shop-raise divide-y divide-paper/[0.09] overflow-hidden rounded-[18px]">
        {orderLines(order).map((line, i) => {
          if (line.kind === "item") {
            const item = order.items[i];
            return (
              <li key={i} className="flex items-center gap-3 px-3.5 py-3">
                <PiecePhoto photo={piecePhoto(item?.product ?? null)} sizes="40px" className="rounded-[9px]" style={{ width: 40, height: 50 }} />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[14.5px] font-semibold leading-snug text-paper">{line.title}</p>
                  <p className="mt-0.5 font-sans text-caption tabular-nums text-paper/60">
                    {line.quantity} · {price(line.cents)}
                  </p>
                </div>
              </li>
            );
          }
          const label =
            line.kind === "shipping" ? t("shop.shipping") : line.kind === "tax" ? t("shop.tax") : t("shop.total");
          const value =
            line.kind === "shipping" && line.cents === 0 ? t("shop.orderShippingFree") : price(line.cents);
          return (
            <li
              key={line.kind}
              className={cn(
                "flex min-h-[52px] items-center justify-between gap-3 px-3.5 py-3 font-sans",
                line.kind === "total" ? "text-ui font-semibold text-paper" : "text-[13.5px] text-paper/80",
              )}
            >
              <span className={line.kind === "total" ? undefined : "text-paper/60"}>{label}</span>
              <span className="tabular-nums">{value}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
