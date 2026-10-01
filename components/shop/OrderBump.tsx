"use client";

import Image from "next/image";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { useIsNative } from "@/lib/platform/native";
import { addToCart } from "@/lib/shop/cart";
import { formatPrice } from "@/lib/shop/format";
import { productHref } from "@/lib/shop/productHref";
import type { ShopProductFull } from "@/lib/shop/types";

/**
 * One piece offered beside an order, added with one tap: the cart's order
 * bump, and the thank-you page's follow-up. Which piece is lib/shop/addOn.ts.
 *
 * It says what it is, what it costs, and in the cart what adding it does to
 * the order (free shipping, the multi-buy price), which the cart prices with
 * checkout's own function (lib/shop/cartOffers.ts). Nothing else. No "only
 * today", no count, no timer (the shop's rule on copy, lib/email/doctrine.ts).
 */
export function OrderBump({
  product,
  heading,
  priceCents,
  onAdded,
  className,
}: {
  product: ShopProductFull;
  heading: string;
  /** Its price in this order once added, when an offer would lower it. */
  priceCents?: number;
  onAdded?: () => void;
  className?: string;
}) {
  const { t } = useTranslate();
  const native = useIsNative();
  const image = product.media[0];

  function add() {
    addToCart({
      slug: product.slug,
      title: product.title,
      priceCents: product.price_cents,
      currency: product.currency ?? "usd",
      imageUrl: image?.media_url,
      imageAlt: image?.alt_text,
    });
    onAdded?.();
  }

  return (
    <section
      aria-label={heading}
      className={cn("flex items-center gap-3 rounded-xl border border-paper/12 bg-paper/[0.03] p-3", className)}
    >
      <Link href={productHref(product.slug, native)} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-paper/[0.05]">
        {image ? <Image src={image.media_url} alt={image.alt_text} fill sizes="56px" className="object-cover" /> : null}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-caption text-paper/55">{heading}</p>
        <Link
          href={productHref(product.slug, native)}
          className="block truncate font-sans text-detail font-semibold text-paper hover:text-paper/80"
        >
          {product.title}
        </Link>
        {priceCents != null && priceCents < product.price_cents ? (
          <p className="font-sans text-caption tabular-nums">
            <span className="mr-1.5 text-paper/40 line-through">{formatPrice(product.price_cents, product.currency ?? "usd")}</span>
            <span className="font-semibold text-emerald-300">{formatPrice(priceCents, product.currency ?? "usd")}</span>
          </p>
        ) : (
          <p className="font-sans text-caption tabular-nums text-paper/70">{formatPrice(product.price_cents, product.currency ?? "usd")}</p>
        )}
      </div>
      <button
        type="button"
        onClick={add}
        aria-label={t("shop.bumpAddX", { title: product.title })}
        className="tap-press inline-flex min-h-11 shrink-0 items-center rounded-pill border border-paper/25 px-4 font-sans text-detail font-semibold text-paper hover:border-paper/45"
      >
        {t("shop.bumpAdd")}
      </button>
    </section>
  );
}
