"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useIsNative } from "@/lib/platform/native";
import { productHref } from "@/lib/shop/productHref";

/**
 * Stripe returns here when the buyer backs out of payment. The pending
 * order is cancelled server-side (fire once, idempotent), so nothing
 * lingers in "Your orders". Quiet by design: no scolding, one line, two
 * doors, and an honest note that nothing was charged.
 */
export function CheckoutCancelledClient() {
  const { t } = useTranslate();
  const native = useIsNative();
  const params = useSearchParams();
  const order = params.get("order");
  const product = params.get("product");
  // With no order id there is nothing to tidy; start settled.
  const [done, setDone] = useState(!order);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    apiFetch("/api/shop/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order }),
    })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [order]);

  return (
    <div className="mx-auto w-full max-w-[560px] px-5 pt-14 text-center md:px-8 md:pt-20">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
        {t("shop.purifyShop")}
      </p>
      <h1 className="mt-3 font-display-serif text-heading md:text-display-sm text-paper">
        {t("shop.checkoutCancelled")}
      </h1>
      <p className="mt-4 font-serif text-lede text-paper/70 leading-[1.65]">
        {t("shop.nothingWasChargedAndNo")}
      </p>
      {!done ? (
        <p className="mt-3 font-sans text-caption text-paper/45">{t("shop.tidyingUp")}</p>
      ) : null}
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href={product ? productHref(product, native) : "/shop"}
          className="tap-press inline-flex min-h-[48px] items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          {t("shop.backToTheIcon")}
        </Link>
        <Link
          href="/shop"
          className="tap-press inline-flex min-h-[48px] items-center rounded-pill border border-paper/20 px-7 font-sans text-ui font-semibold text-paper hover:border-paper/40"
        >
          {t("shop.browseTheShop")}
        </Link>
      </div>
    </div>
  );
}
