import type { Metadata } from "next";
import Link from "next/link";

import { orderConfirmationNumber } from "@/lib/shop/orderNumber";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Order confirmed" };

/**
 * Stripe returns here after payment. Deliberately quiet: the order id
 * comes from our own database (passed on the success URL), the webhook
 * settles the payment state, and /shop/orders shows the living status.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-[560px] px-5 pt-14 text-center md:px-8 md:pt-20">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
        Purify Shop
      </p>
      <h1 className="mt-3 font-display-serif text-heading md:text-display-sm text-paper">
        Thank you.
      </h1>
      <p className="mt-4 font-serif text-lede text-paper/70 leading-[1.65]">
        Your order is confirmed. A receipt is on its way to your email, and
        we&rsquo;ll write again when your icon ships.
      </p>
      {order ? (
        <p className="mt-3 font-sans text-caption text-paper/60">
          Confirmation number:{" "}
          <span className="font-semibold tracking-wide text-paper/80">
            {orderConfirmationNumber(order)}
          </span>
        </p>
      ) : null}
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/shop/orders"
          className="tap-press inline-flex min-h-[48px] items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          Track your order
        </Link>
        <Link
          href="/shop"
          className="tap-press inline-flex min-h-[48px] items-center rounded-pill border border-paper/20 px-7 font-sans text-ui font-semibold text-paper hover:border-paper/40"
        >
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
