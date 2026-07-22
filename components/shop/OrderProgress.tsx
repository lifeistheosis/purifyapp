"use client";

import { cn } from "@/lib/cn";
import { estimatedShipWindow, type DispatchWindow } from "@/lib/shop/eta";
import {
  BUYER_ORDER_STEPS,
  buyerStepIndex,
  type BuyerOrderStatus,
} from "@/lib/shop/status";
import { trackingLink } from "@/lib/shop/trackingLink";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The buyer's live order tracker: the step bar, an HONEST ship estimate,
 * and a live tracking link once the parcel is with a carrier.
 *
 * The estimate is derived from the dispatch window promised on each item's
 * own listing (the slowest item governs), counted from the order date. It
 * disappears the moment the order ships. No invented delivery dates: after
 * handoff, the carrier's own tracker is the source of truth, one tap away.
 */
export function OrderProgress({
  status,
  placedAt,
  updatedAt,
  items,
  tracking,
}: {
  status: BuyerOrderStatus;
  placedAt: string;
  updatedAt?: string | null;
  items: (DispatchWindow | null | undefined)[];
  tracking: string | null;
}) {
  const { t } = useTranslate();
  const step = buyerStepIndex(status);
  const estimate =
    step >= 0 && step < buyerStepIndex("Shipped")
      ? estimatedShipWindow(placedAt, items)
      : null;
  const link = tracking ? trackingLink(tracking) : null;
  const fmtDay = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <section
      aria-label={t("shop.orderProgress")}
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

      {estimate ? (
        estimate.late ? (
          <p className="mt-4 font-sans text-detail text-amber-200/90">
            {t("shop.shipEstimateLate")}
          </p>
        ) : (
          <p className="mt-4 font-sans text-detail text-paper/75">
            {t("shop.shipEstimate", {
              from: fmtDay(estimate.from),
              to: fmtDay(estimate.to),
            })}
          </p>
        )
      ) : null}

      {tracking ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 font-sans text-detail text-paper/65">
            {t("shop.tracking")}{" "}
            <span className="break-all text-paper">{tracking}</span>
            {link?.carrier ? (
              <span className="text-paper/45"> · {link.carrier}</span>
            ) : null}
          </p>
          {link ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-press inline-flex min-h-[36px] shrink-0 items-center rounded-pill bg-paper px-4 font-sans text-detail font-semibold text-night"
            >
              {t("shop.trackYourPackage")} ↗
            </a>
          ) : null}
        </div>
      ) : null}

      {updatedAt && step >= 1 ? (
        <p className="mt-3 font-sans text-eyebrow text-paper/40">
          {t("shop.lastUpdated", { date: fmtDay(new Date(updatedAt)) })}
        </p>
      ) : null}
    </section>
  );
}
