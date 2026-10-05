"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { VitrineImage } from "@/components/shop/VitrineImage";
import { RatingStars } from "@/components/shop/RatingStars";
import { Cart } from "@/components/ui/icons/Cart";
import { Check } from "@/components/ui/icons/Check";
import { Cross } from "@/components/ui/icons/Cross";
import { useIsNative } from "@/lib/platform/native";
import { addToCart } from "@/lib/shop/cart";
import { formatPrice, productRating, unitsSoldLabel } from "@/lib/shop/format";
import { productHref } from "@/lib/shop/productHref";
import { stockUrgency } from "@/lib/shop/stock";
import type { ShopInventoryStatus, ShopProductFull } from "@/lib/shop/types";
import { cn } from "@/lib/cn";

/** Catalog key for each availability status, so the line reads in the
 *  visitor's language rather than the table's English. */
const INVENTORY_LABEL_KEYS: Record<ShopInventoryStatus, string> = {
  ready_to_ship: "shop.readyToShipX",
  special_order: "shop.specialOrder",
  coming_soon: "shop.comingSoon",
  out_of_stock: "shop.outOfStock",
};

/** The dot beside the availability line: green for in hand, gold for made
 *  to order, blue for coming, grey for gone. */
const DOT: Record<ShopInventoryStatus, string> = {
  ready_to_ship: "bg-emerald-400",
  special_order: "bg-premium",
  coming_soon: "bg-sky-400",
  out_of_stock: "bg-paper/35",
};

/**
 * A piece in the shop (redrawn 2026-09-30, "elevate the dark look").
 *
 * The photograph is the card. It stands in a lit vitrine (`.shop-vitrine` in
 * app/globals.css: a soft gold light behind the piece, on the palette's own
 * raised surface) and everything else sits under it on the page, in the
 * order a buyer reads: what it is, whether it is in hand, the price and one
 * tap to the cart. No box around the words, no classification eyebrow, no
 * red badge on the photograph.
 *
 * Scarcity is still said when it is true (lib/shop/stock.ts only speaks for
 * a real count of five or fewer on a piece in hand), in the gold of the
 * availability line rather than an alarm red.
 *
 * Icons are sacred images: never crop a face. The photograph is contained,
 * never covered.
 *
 * The card is a plain container (not an <a>) so the heart and the add button
 * stay truly interactive; a stretched Link sits beneath them and carries the
 * rest of the surface into the product page.
 */
export function ProductCard({
  product,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  className,
  style,
}: {
  product: ShopProductFull;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { t, tn } = useTranslate();
  const native = useIsNative();
  const image = product.media[0];
  const rating = productRating(product);
  const sold = unitsSoldLabel(product.units_sold);
  const soldOut = product.inventory_status === "out_of_stock";
  const urgency = stockUrgency(product);
  const priceLabel = formatPrice(product.price_cents, product.currency);
  const [added, setAdded] = useState(false);

  function quickAdd() {
    addToCart({
      slug: product.slug,
      title: product.title,
      priceCents: product.price_cents,
      currency: product.currency,
      imageUrl: image?.media_url,
      imageAlt: image?.alt_text,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div
      style={style}
      // h-full: fill the (equal-height) grid or rail cell so the mt-auto
      // price row lands on one baseline across a row of cards.
      className={cn("group relative isolate flex h-full flex-col", className)}
    >
      <div
        className={cn(
          "shop-vitrine relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-inset ring-paper/[0.07] transition-[box-shadow] duration-500 group-hover:ring-premium/45",
          soldOut && "opacity-70",
        )}
      >
        {image ? (
          <VitrineImage
            src={image.media_url}
            alt={image.alt_text}
            fill
            sizes={sizes}
            className="object-contain p-3.5 drop-shadow-[0_18px_22px_rgba(0,0,0,0.45)] transition-transform duration-700 ease-house group-hover:scale-[1.04] md:p-5"
          />
        ) : (
          <div aria-hidden className="flex h-full items-center justify-center text-paper/15">
            <Cross size={56} />
          </div>
        )}

        {/* Save heart floats above the stretched link. */}
        <FavoriteButton
          productSlug={product.slug}
          title={product.title}
          storeName={product.store.public_name}
          priceLabel={priceLabel}
          imageUrl={image?.media_url}
          imageAlt={image?.alt_text}
          // A flat tint, not frosted glass. `backdrop-blur-sm` here was
          // half of what the shop cost to scroll on a phone: a blur over
          // whatever is behind it is drawn again on every frame the page
          // moves, there is one on every piece, and each piece is itself
          // moving (.shop-rise). Traced on the live shop on 2026-10-05, the
          // same six swipes down and back at a phone's size with the
          // processor slowed four times: 1,270 ms of drawing with the blur,
          // 633 ms without. Over the vitrine's own dark ground the two look
          // the same.
          className="absolute right-2 top-2 z-20 h-11 w-11 bg-night/70"
        />
      </div>

      {/* Stretched navigation target: covers the whole card, sits below the
          interactive controls. */}
      <Link
        href={productHref(product.slug, native)}
        aria-label={product.title}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper"
      />

      <div className="flex flex-1 flex-col px-0.5 pt-3">
        {/* Two lines held open even for a short title, so a row of cards
            keeps one baseline. */}
        <h3 className="line-clamp-2 min-h-[2.6em] font-heading text-ui leading-[1.3] text-paper transition-colors group-hover:text-paper/80 md:text-lede md:leading-[1.3]">
          {product.title}
        </h3>

        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 font-sans text-caption text-paper/60">
          <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[product.inventory_status])} />
          <span className="truncate">
            {t(INVENTORY_LABEL_KEYS[product.inventory_status])}
            {urgency.label ? (
              <span className="font-semibold text-premium-ink">
                {" · "}
                {urgency.level === "last" ? t("shop.lastOne") : tn("shop.onlyLeft", urgency.remaining ?? 0)}
              </span>
            ) : null}
          </span>
        </p>

        {rating.count > 0 ? (
          <div className="mt-1.5">
            <RatingStars avg={rating.avg} count={rating.count} />
          </div>
        ) : sold ? (
          <p className="mt-1.5 font-sans text-caption text-paper/50">
            {tn("shop.soldCount", product.units_sold ?? 0)}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className="font-sans text-ui font-semibold tabular-nums text-paper md:text-lede">{priceLabel}</p>
          {!soldOut ? (
            <button
              type="button"
              onClick={quickAdd}
              aria-label={
                added
                  ? t("shop.addedToCart")
                  : t("shop.addProductToCart", { title: product.title })
              }
              className={cn(
                "tap-press relative z-20 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors",
                added
                  ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                  : "border-paper/15 bg-paper/[0.06] text-paper hover:border-paper hover:bg-paper hover:text-night",
              )}
            >
              {added ? <Check size={18} /> : <Cart size={18} />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
