"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { clearCart } from "@/lib/shop/cart";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Stripe returns here after payment. The order id comes from our own
 * database (passed on the success URL), the webhook settles the payment
 * state, and /shop/orders shows the living status. Reads the id
 * client-side so it works in the native local-first export.
 *
 * The moment deserves a little ceremony: a gold ring scales in, the
 * check draws itself, and the words rise beneath it. Pure CSS, under a
 * second, honored by prefers-reduced-motion.
 */
export function CheckoutSuccessClient() {
  const { t } = useTranslate();
  const order = useSearchParams().get("order") ?? "";

  // The purchase is committed; whatever was in the local cart is bought
  // (cart checkout) or superseded (buy-now). Either way it must not
  // linger and re-offer itself.
  useEffect(() => {
    clearCart();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[560px] px-5 pt-14 text-center md:px-8 md:pt-20">
      {/* eslint-disable-next-line react/jsx-no-literals -- CSS template, not copy */}
      <style>{`
        @keyframes purify-pop {
          0% { transform: scale(0.4); opacity: 0; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes purify-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes purify-rise {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .purify-pop { animation: purify-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .purify-check { stroke-dasharray: 48; stroke-dashoffset: 48; animation: purify-draw 0.45s ease-out 0.35s forwards; }
        .purify-rise { animation: purify-rise 0.5s ease-out both; }
        .purify-rise-1 { animation-delay: 0.45s; }
        .purify-rise-2 { animation-delay: 0.6s; }
        .purify-rise-3 { animation-delay: 0.75s; }
        @media (prefers-reduced-motion: reduce) {
          .purify-pop, .purify-rise { animation: none; opacity: 1; transform: none; }
          .purify-check { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="purify-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/60 bg-gold/10">
        <svg
          viewBox="0 0 40 40"
          className="h-10 w-10"
          fill="none"
          aria-hidden
        >
          <path
            d="M10 21 L17 28 L30 13"
            stroke="#c9a961"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="purify-check"
          />
        </svg>
      </div>

      <div className="purify-rise purify-rise-1">
        <p className="mt-6 font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          {t("shop.purifyShop")}
        </p>
        <h1 className="mt-3 font-display-serif text-heading md:text-display-sm text-paper">
          {t("study.thankYou")}
        </h1>
      </div>

      <div className="purify-rise purify-rise-2">
        <p className="mt-4 font-serif text-lede text-paper/70 leading-[1.65]">
          {t("shop.yourOrderIsConfirmedA")}
        </p>
        {order ? (
          <p className="mt-3 font-sans text-caption text-paper/60">
            {t("shop.confirmationNumber")}{" "}
            <span className="font-semibold tracking-wide text-paper/80">
              {orderConfirmationNumber(order)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="purify-rise purify-rise-3 mt-8 flex justify-center gap-3">
        <Link
          href="/shop/orders"
          className="tap-press inline-flex min-h-[48px] items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          {t("shop.trackYourOrder")}
        </Link>
        <Link
          href="/shop"
          className="tap-press inline-flex min-h-[48px] items-center rounded-pill border border-paper/20 px-7 font-sans text-ui font-semibold text-paper hover:border-paper/40"
        >
          {t("shop.backToTheShop")}
        </Link>
      </div>
    </div>
  );
}
