"use client";

import type { CSSProperties, ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { EikonBox } from "@/components/shop/EikonMarks";
import { ExternalGlyph } from "@/components/shop/shopGlyphs";
import { cn } from "@/lib/cn";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";
import type { BuyerOrder } from "@/lib/shop/buyerReads";
import {
  offLadder,
  shipsInEikonBox,
  STATUS_KEY,
  stepMeaningKey,
  storyEstimate,
  storySteps,
  trackingInFours,
  type StoryStep,
} from "@/lib/shop/orderStory";
import { trackingLink } from "@/lib/shop/trackingLink";

/** "Oct 29", the device's own way: a step's day, and the order's beside its thread. */
export function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString(deviceDateLocale(), { month: "short", day: "numeric" });
}

/**
 * An order's whole story (r3-19, Orders B, the owner's pick of 2026-10-31),
 * in place of build 85's bar of five steps with their names in 10px under it:
 * Order Confirmed, Preparing Your Order, Ready to Ship, Shipped, Delivered,
 * done solid, the step it is on lit, what is ahead hollow and the way to it
 * dashed. The words and the marks are lib/shop/orderStory.ts, the same as the
 * admin's Orders B and the support email's tracking card.
 *
 * Under the lit step, what it means (the packing slip's own line, at
 * Preparing Your Order) and the honest ship estimate in a carved well, until
 * the parcel is with the carrier. At Shipped, EIKON's black box with its
 * seal: waiting, with its tracking number "here the day it leaves", then the
 * carrier, the number and Track your package. No delivery date is ever made
 * up: once it ships, the carrier's own tracking is the truth.
 *
 * Motion: the spine draws down to the lit step a step at a time and its glow
 * comes up last (app/globals.css, .shop-step-line, .shop-mark); with Purify's
 * motion off, all of it is simply there.
 */
export function OrderStory({ order, now }: { order: BuyerOrder; now: Date }) {
  const { t } = useTranslate();
  const day = shortDay;

  const off = offLadder(order);
  if (off) {
    // Refunded or cancelled: off the road, so one line says so instead of a ladder.
    return (
      <section aria-label={t("shop.orderProgress")} data-story className="shop-raise rounded-[22px] px-4 py-[18px]">
        <p className="flex items-center gap-3.5">
          <span aria-hidden className="shop-mark" data-state="done" />
          <span className="min-w-0 flex-1 font-sans text-[15px] font-semibold text-paper">{t(STATUS_KEY[off])}</span>
          {order.updated_at ? <span className="shrink-0 font-sans text-caption text-paper/60">{day(order.updated_at)}</span> : null}
        </p>
      </section>
    );
  }

  const steps = storySteps(order);
  const estimate = storyEstimate(order, now);
  const tracking = order.outbound_tracking?.trim() || null;
  const link = tracking ? trackingLink(tracking) : null;
  const eikon = shipsInEikonBox(order.store);

  /** The spine from step i down to the next. */
  const lineOf = (i: number): "done" | "lead" | "ahead" =>
    steps[i + 1].state !== "todo" ? "done" : steps[i].state === "now" ? "lead" : "ahead";

  function body(s: StoryStep): ReactNode {
    if (s.word === "Shipped") {
      if (s.state === "todo") {
        return eikon ? (
          <div className="mt-2 flex items-center gap-3.5">
            <EikonBox width={66} />
            <p className="min-w-0 font-sans text-[12.5px] leading-[1.35] text-paper/60">{t("shop.shippedBoxAhead")}</p>
          </div>
        ) : null;
      }
      if (s.state === "done") {
        return tracking ? (
          <p className="mt-1 break-all font-sans text-caption tabular-nums text-paper/50">
            {link?.carrier ? `${link.carrier} · ` : ""}
            {trackingInFours(tracking)}
          </p>
        ) : null;
      }
      if (!eikon && !tracking) return null;
      return (
        <>
          <div className="mt-2.5 flex items-center gap-3">
            {eikon ? <EikonBox width={56} /> : null}
            {tracking ? (
              <div className="min-w-0">
                <p className="font-sans text-caption text-paper/60">{link?.carrier ?? t("shop.tracking")}</p>
                <p className="break-all font-sans text-[12.5px] tabular-nums text-paper/90">{trackingInFours(tracking)}</p>
              </div>
            ) : null}
          </div>
          {link ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shop-btn-lit tap-press mt-3 inline-flex min-h-11 items-center gap-2 rounded-pill px-4 font-sans text-detail font-semibold"
            >
              {t("shop.trackYourPackage")}
              <ExternalGlyph size={15} strokeWidth={1.8} />
            </a>
          ) : null}
        </>
      );
    }
    if (s.state !== "now") return null;
    const meaning = stepMeaningKey(s.word);
    return (
      <>
        {meaning ? <p className="mt-1.5 font-serif text-[14.5px] leading-[1.5] text-paper/80">{t(meaning)}</p> : null}
        {estimate ? (
          <p className="shop-well mt-2.5 rounded-[14px] px-3 py-2.5 font-sans text-[13.5px] leading-snug text-paper/90">
            {estimate.late
              ? t("shop.shipEstimateLate")
              : t("shop.shipEstimate", { from: day(estimate.from.toISOString()), to: day(estimate.to.toISOString()) })}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section aria-label={t("shop.orderProgress")} data-story className="shop-raise rounded-[22px] px-4 py-[18px]">
      <ol>
        {steps.map((s, i) => (
          <li
            key={s.word}
            data-state={s.state}
            aria-current={s.state === "now" ? "step" : undefined}
            className={cn("relative flex gap-3.5", i < steps.length - 1 && "pb-4")}
            style={{ "--i": i } as CSSProperties}
          >
            {i < steps.length - 1 ? <span aria-hidden className="shop-step-line" data-line={lineOf(i)} /> : null}
            <span aria-hidden className="shop-mark mt-[3px]" data-state={s.state} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "font-sans text-[15px] font-semibold leading-snug",
                    s.state === "todo" ? "text-paper/50" : "text-paper",
                    s.state === "now" && "shop-lit",
                  )}
                >
                  {t(STATUS_KEY[s.word])}
                </span>
                {s.at ? (
                  <span className="shrink-0 font-sans text-caption text-paper/60">
                    {s.since ? t("shop.stepSince", { date: day(s.at) }) : day(s.at)}
                  </span>
                ) : null}
              </div>
              {body(s)}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
