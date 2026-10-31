"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { OrderPieces } from "@/components/shop/PiecePhoto";
import { ShopError, ShopListSkeleton, ShopSignInPrompt } from "@/components/shop/ShopStates";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";
import { readOrders, type BuyerOrder } from "@/lib/shop/buyerReads";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { groupOrders, orderTitle, STATUS_KEY, storyEstimate, type OrderGroup } from "@/lib/shop/orderStory";
import { trackingLink } from "@/lib/shop/trackingLink";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import { AUTH_UNRESOLVED_MESSAGE, resolveUser } from "@/lib/supabase/resolveUser";

type Result = { signedIn: false } | { signedIn: true; orders: BuyerOrder[]; now: number };

async function load(): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  // RLS self-select: only the caller's orders can come back.
  const orders = await readOrders(createClient());
  return { signedIn: true, orders, now: Date.now() };
}

/**
 * Your orders, Orders B, "The whole story" (r3-19, the owner's pick of
 * 2026-10-31): the reader's orders under their own five words, a spine down
 * the side, each order a card with its piece, its EIK number (the one support
 * and the console go by, lib/shop/orderNumber.ts) and the one line that
 * matters; a checkout left before paying last, dashed, with Remove. An order
 * opens as its whole story (OrderDetailClient).
 */
export function OrdersClient() {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(load, []);

  // Asking again after a Remove keeps the list on screen.
  if (loading && !data) return <ShopListSkeleton />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return <ShopSignInPrompt title={t("shop.yourOrders")} body={t("shop.signInToSeeOrders")} next="/shop/orders" />;
  }
  const orders = data && data.signedIn ? data.orders : [];
  const now = data && data.signedIn ? data.now : 0;

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-8 md:px-8">
      <header className="pt-6 md:pt-14">
        <h1 className="font-heading text-[30px] font-semibold leading-[1.12] tracking-[-0.2px] text-paper">{t("shop.yourOrders")}</h1>
        <p className="mt-1.5 font-sans text-[12.5px] leading-snug text-paper/60">{t("shop.ordersLede")}</p>
      </header>
      <OrdersList orders={orders} now={now} onChanged={reload} className="mt-6" />
    </div>
  );
}

/**
 * The orders under their words. The page draws each as a card; the website's
 * order page draws the same list as a quieter rail beside the open order
 * (`rail`), the open one lit.
 */
export function OrdersList({
  orders,
  now,
  onChanged,
  rail = false,
  currentId,
  className,
}: {
  orders: readonly BuyerOrder[];
  now: number;
  onChanged?: () => void;
  rail?: boolean;
  currentId?: string;
  className?: string;
}) {
  const { t } = useTranslate();
  const groups = groupOrders(orders, now);
  if (!groups.length) {
    return <p className={cn("font-serif text-body leading-[1.65] text-paper/65", className)}>{t("shop.noOrdersYetWhenYou")}</p>;
  }
  return (
    <div className={cn("relative", className)}>
      {/* The spine the words hang on, fading out under the last. */}
      <span aria-hidden className="shop-spine" />
      {groups.map((g) => (
        <Group key={g.word} group={g} now={now} rail={rail} currentId={currentId} onChanged={onChanged} />
      ))}
    </div>
  );
}

function Group({
  group,
  now,
  rail,
  currentId,
  onChanged,
}: {
  group: OrderGroup<BuyerOrder>;
  now: number;
  rail: boolean;
  currentId?: string;
  onChanged?: () => void;
}) {
  const { t } = useTranslate();
  const unfinished = group.word === "notFinished";
  const label = unfinished ? t("shop.orderNotFinished") : t(STATUS_KEY[group.word as keyof typeof STATUS_KEY]);
  // Beside an open order the page's heading is the order's own, so the rail's words are not headings.
  const Heading = rail ? "p" : "h2";
  return (
    <section aria-label={label} className={rail ? "mb-3" : "mb-1"}>
      <Heading className="relative mb-2.5 flex items-center gap-3">
        <span aria-hidden className="shop-mark" data-state={group.mark} data-size={rail ? "sm" : undefined} />
        <span
          className={cn(
            "font-sans font-semibold",
            rail ? "text-[13px] text-paper/70" : "text-[15px]",
            !rail && (unfinished ? "text-paper/60" : "text-paper"),
            !rail && group.mark === "now" && "shop-lit",
          )}
        >
          {label}
        </span>
      </Heading>
      <ul className={cn("ms-6", rail ? "space-y-1" : "space-y-[18px] pb-[18px]")}>
        {group.orders.map((o) =>
          unfinished ? (
            <UnfinishedRow key={o.id} order={o} onRemoved={onChanged} />
          ) : (
            <OrderCard key={o.id} order={o} now={now} rail={rail} current={o.id === currentId} />
          ),
        )}
      </ul>
    </section>
  );
}

/** The one line under an order: when it ships, where it is, or the day it came. */
function useOrderLine() {
  const { t } = useTranslate();
  const short = (iso: string) => new Date(iso).toLocaleDateString(deviceDateLocale(), { month: "short", day: "numeric" });
  const long = (iso: string) => new Date(iso).toLocaleDateString(deviceDateLocale(), { month: "long", day: "numeric" });
  return (o: BuyerOrder, now: number): string => {
    const word = o.fulfillment_status;
    const since = o.updated_at ? t("shop.stepSince", { date: short(o.updated_at) }) : "";
    if (o.payment_status === "paid" && (word === "delivered" || word === "refunded" || word === "cancelled")) {
      return o.updated_at ? long(o.updated_at) : "";
    }
    if (o.payment_status !== "paid") return o.updated_at ? long(o.updated_at) : "";
    if (word === "shipped") {
      const carrier = o.outbound_tracking ? trackingLink(o.outbound_tracking)?.carrier : null;
      return [since, carrier].filter(Boolean).join(" · ");
    }
    const estimate = storyEstimate(o, new Date(now));
    if (estimate && !estimate.late) return t("shop.shipEstimate", { from: short(estimate.from.toISOString()), to: short(estimate.to.toISOString()) });
    return since;
  };
}

function OrderCard({ order, now, rail, current }: { order: BuyerOrder; now: number; rail: boolean; current: boolean }) {
  const { tn } = useTranslate();
  const lineOf = useOrderLine();
  const { first, more } = orderTitle(order.items);
  const line = lineOf(order, now);
  return (
    <li
      className={cn(
        "press-card relative flex items-center gap-3",
        rail ? "rounded-2xl p-3" : "shop-raise rounded-[20px] p-3",
        rail && current && "shop-raise ring-1 ring-paper/50",
      )}
    >
      <OrderPieces items={order.items} width={rail ? 44 : 50} height={rail ? 56 : 62} />
      <div className="min-w-0 flex-1">
        <p className={cn("font-sans font-semibold leading-[1.3] text-paper", rail ? "truncate text-[14.5px]" : "text-[15px]")}>
          <Link href={`/shop/orders/detail?id=${order.id}`} aria-current={current ? "page" : undefined} className="after:absolute after:inset-0">
            {first}
            {more ? <span className="font-medium text-paper/60"> {tn("shop.andMore", more)}</span> : null}
          </Link>
        </p>
        <p className="mt-[3px] font-sans text-[11.5px] font-medium tracking-[0.06em] tabular-nums text-paper/50">
          {orderConfirmationNumber(order.id)}
        </p>
        {line ? <p className={cn("mt-[3px] font-sans leading-snug text-paper/80", rail ? "text-caption" : "text-[12.5px]")}>{line}</p> : null}
      </div>
      {!rail ? <ChevronRight size={16} className="shrink-0 text-paper/40 rtl:-scale-x-100" /> : null}
    </li>
  );
}

/** A checkout started and never paid: nothing was charged, and it can go. */
function UnfinishedRow({ order, onRemoved }: { order: BuyerOrder; onRemoved?: () => void }) {
  const { t, tn } = useTranslate();
  const [busy, setBusy] = useState(false);
  const { first, more } = orderTitle(order.items);
  async function remove() {
    setBusy(true);
    try {
      await apiFetch("/api/shop/checkout/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
    } catch {
      /* the reload shows the truth either way */
    }
    onRemoved?.();
  }
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-dashed border-paper/20 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[13.5px] font-semibold text-paper/80">
          {first}
          {more ? <span className="font-medium text-paper/60"> {tn("shop.andMore", more)}</span> : null}
        </p>
        <p className="mt-0.5 font-sans text-caption text-paper/55">{t("shop.youLeftCheckoutBeforePaying")}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void remove()}
        className="shop-knob tap-press inline-flex min-h-11 shrink-0 items-center rounded-pill px-4 font-sans text-detail font-semibold text-paper disabled:opacity-60"
      >
        {busy ? t("shop.removing") : t("shop.storeRemove")}
      </button>
    </li>
  );
}
