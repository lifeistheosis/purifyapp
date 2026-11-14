"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { shortDay } from "@/components/shop/OrderStory";
import { PiecePhoto } from "@/components/shop/PiecePhoto";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { BuyerOrder } from "@/lib/shop/buyerReads";
import { formatPrice } from "@/lib/shop/format";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { orderTitle, piecePhoto, STATUS_KEY, storyEstimate, storySteps } from "@/lib/shop/orderStory";
import { buyerOrderStatus, buyerStepIndex } from "@/lib/shop/status";

/** The mark of the step an order is on, small: lit on the road, solid once arrived, hollow off it. */
function stateOf(order: BuyerOrder): "now" | "done" | "todo" {
  const word = buyerOrderStatus(order);
  const step = buyerStepIndex(word);
  return step < 0 ? "todo" : word === "Delivered" ? "done" : "now";
}

/**
 * The order a thread is about, pinned under the name (r3-19, Messages A, the
 * owner's pick of 2026-10-31): its piece, its EIK number and the step it is
 * on, lit. Build 85 had a text link, "View the order". The whole card opens
 * the order's own page.
 */
export function OrderPin({ order }: { order: BuyerOrder }) {
  const { t, tn } = useTranslate();
  const { first, more } = orderTitle(order.items);
  return (
    <Link
      href={`/shop/orders/detail?id=${order.id}`}
      className="shop-raise press-card mt-3 flex items-center gap-3 rounded-2xl px-3 py-2.5"
    >
      <PiecePhoto photo={piecePhoto(order.items[0]?.product ?? null)} sizes="38px" className="rounded-lg" style={{ width: 38, height: 48 }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-ui font-semibold text-paper">
          {first}
          {more ? <span className="font-medium text-paper/60"> {tn("shop.andMore", more)}</span> : null}
        </span>
        <span className="mt-[3px] flex items-center gap-[7px]">
          <span aria-hidden className="shop-mark" data-size="sm" data-state={stateOf(order)} />
          <span className="truncate font-sans text-caption text-paper/80">
            {orderConfirmationNumber(order.id)} · {t(STATUS_KEY[buyerOrderStatus(order)])}
          </span>
        </span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-paper/40 rtl:-scale-x-100" />
    </Link>
  );
}

/** The five marks on one line, the same marks as the order's story. */
export function MarksRow({ order }: { order: BuyerOrder }) {
  const steps = storySteps(order);
  return (
    <span aria-hidden className="flex items-center">
      {steps.map((s, i) => (
        <span key={s.word} className="contents">
          {i ? <span className="shop-seg" data-done={s.state !== "todo" ? "" : undefined} /> : null}
          <span className="shop-mark" data-size="sm" data-state={s.state} />
        </span>
      ))}
    </span>
  );
}

/** The order beside a thread at the website's width: the piece, the step lit on its marks, and the way to it. */
export function OrderSide({ order, now }: { order: BuyerOrder; now: number }) {
  const { t, tn } = useTranslate();
  const { first, more } = orderTitle(order.items);
  const word = buyerOrderStatus(order);
  const estimate = storyEstimate(order, new Date(now));
  const day = (d: Date) => shortDay(d.toISOString());
  return (
    <section aria-label={t("shop.yourOrder")}>
      <p className="mb-2 font-sans text-[13px] font-semibold text-paper/60">{t("shop.yourOrder")}</p>
      <div className="shop-raise rounded-[20px] p-4">
        <div className="flex items-start gap-3">
          <PiecePhoto photo={piecePhoto(order.items[0]?.product ?? null)} sizes="56px" className="rounded-[11px]" style={{ width: 56, height: 70 }} />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[11.5px] font-medium tracking-[0.06em] tabular-nums text-paper/50">{orderConfirmationNumber(order.id)}</p>
            <p className="mt-0.5 font-heading text-[16.5px] font-semibold leading-snug text-paper">
              {first}
              {more ? <span className="font-medium text-paper/60"> {tn("shop.andMore", more)}</span> : null}
            </p>
            <p className="mt-0.5 font-sans text-caption text-paper/60">
              {t("shop.placed")} {day(new Date(order.created_at))} · {formatPrice(order.total_cents, order.currency)}
            </p>
          </div>
        </div>
        <p className={stateOf(order) === "now" ? "shop-lit mt-3.5 font-sans text-[14.5px] font-semibold text-paper" : "mt-3.5 font-sans text-[14.5px] font-semibold text-paper"}>
          {t(STATUS_KEY[word])}
        </p>
        <div className="mt-2.5">
          <MarksRow order={order} />
        </div>
        {estimate && !estimate.late ? (
          <p className="mt-2.5 font-sans text-[12.5px] text-paper/80">
            {t("shop.shipEstimate", { from: day(estimate.from), to: day(estimate.to) })}
          </p>
        ) : null}
        <Link
          href={`/shop/orders/detail?id=${order.id}`}
          className="mt-3.5 flex min-h-11 items-center justify-between border-t border-paper/[0.09] pt-3 font-sans text-detail font-semibold text-paper"
        >
          {t("shop.viewTheOrder")}
          <ChevronRight size={14} aria-hidden className="shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
    </section>
  );
}
