"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Plus } from "@/components/ui/icons/Plus";
import { Truck } from "@/components/ui/icons/Truck";
import { cn } from "@/lib/cn";
import { useIsNative } from "@/lib/platform/native";
import { addToCart, openCartDrawer, useCart } from "@/lib/shop/cart";
import { formatPrice } from "@/lib/shop/format";
import { productHref } from "@/lib/shop/productHref";
import { prayerCornerSet, setShipsFree } from "@/lib/shop/sets";
import type { ShopProductFull } from "@/lib/shop/types";

/**
 * The prayer corner set (lib/shop/sets.ts): an icon, a prayer rope and a
 * cross, added to the cart in one tap.
 *
 *   band     the shop home, under the collection.
 *   compact  a product page, built around the piece on it ("Complete the
 *            prayer corner"). Renders nothing for a piece that has no place
 *            in a set, such as a flag.
 *
 * Only the pieces not already in the cart are added, so a reader who has the
 * icon already is not sold a second one. Each keeps its own price; the total
 * is simply the three added up, and "ships free" appears only when that total
 * clears the shop's own threshold (read live, never typed).
 */
export function PrayerCornerSet({
  products,
  thresholdCents,
  anchor,
  variant = "band",
  className,
}: {
  products: readonly ShopProductFull[];
  thresholdCents: number | null | undefined;
  anchor?: ShopProductFull;
  variant?: "band" | "compact";
  className?: string;
}) {
  const { t } = useTranslate();
  const native = useIsNative();
  const cart = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const set = prayerCornerSet(products, anchor);
  if (!set) return null;

  const inCart = new Set(cart.map((i) => i.slug));
  const missing = set.pieces.filter((p) => !inCart.has(p.slug));
  const complete = missing.length === 0;
  const free = setShipsFree(set, thresholdCents);
  const compact = variant === "compact";

  function addSet() {
    for (const p of missing) {
      const image = p.media[0];
      addToCart({
        slug: p.slug,
        title: p.title,
        priceCents: p.price_cents,
        currency: p.currency,
        imageUrl: image?.media_url,
        imageAlt: image?.alt_text,
      });
    }
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
    openCartDrawer();
  }

  return (
    <section
      aria-labelledby={compact ? "set-compact" : "set-band"}
      className={cn(
        "rounded-2xl border border-premium/20 bg-night-soft/50",
        compact ? "p-4 md:p-5" : "p-5 md:p-8",
        className,
      )}
    >
      <h2 id={compact ? "set-compact" : "set-band"} className={cn("text-paper", compact ? "text-lede" : "text-title-sm md:text-title")}>
        {compact ? t("shop.setComplete") : t("shop.setTitle")}
      </h2>
      <p className="mt-1.5 font-serif text-body leading-[1.55] text-paper/65">{t("shop.setBody")}</p>

      {/* --g is the gap, so the plus between two pieces sits in the middle of it. */}
      <ul className={cn("mt-5 grid grid-cols-3 items-start gap-(--g)", compact ? "[--g:0.625rem]" : "[--g:0.75rem] md:[--g:1.5rem]")}>
        {set.pieces.map((p, i) => {
          const image = p.media[0];
          return (
            <li key={p.id} className="relative">
              {i > 0 ? (
                <span
                  aria-hidden
                  className="absolute left-[calc(var(--g)/-2)] top-[38%] z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-night text-premium-ink ring-1 ring-premium/30 md:h-6 md:w-6"
                >
                  <Plus size={12} />
                </span>
              ) : null}
              <Link href={productHref(p.slug, native)} className="group block">
                <div className="shop-vitrine relative aspect-[4/5] overflow-hidden rounded-xl ring-1 ring-inset ring-paper/[0.07] transition-[box-shadow] group-hover:ring-premium/45">
                  {image ? (
                    <Image src={image.media_url} alt={image.alt_text} fill sizes="(min-width: 768px) 20vw, 30vw" className="object-contain p-2.5 md:p-4" />
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 font-sans text-caption leading-snug text-paper/75 group-hover:text-paper md:text-detail">
                  {p.title}
                </p>
                <p className="mt-0.5 font-sans text-caption font-semibold tabular-nums text-paper md:text-detail">
                  {formatPrice(p.price_cents, p.currency)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-col gap-3 border-t border-paper/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-sans text-ui text-paper/75">
            <span className="font-semibold tabular-nums text-paper">
              {t("shop.setTotal", { total: formatPrice(set.totalCents, set.pieces[0].currency) })}
            </span>
          </p>
          {free ? (
            <p className="mt-1 inline-flex items-center gap-1.5 font-sans text-caption font-semibold text-emerald-300">
              <Truck size={15} />
              {t("shop.setShipsFree")}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={addSet}
          disabled={complete && !justAdded}
          className={cn(
            "tap-press inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-pill px-6 font-sans text-ui font-semibold transition-colors",
            complete || justAdded
              ? "border border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
              : "bg-paper text-night hover:bg-paper/90",
          )}
        >
          {complete || justAdded ? <Check size={17} /> : null}
          {complete || justAdded ? t("shop.setInCart") : t("shop.setAdd")}
        </button>
      </div>
    </section>
  );
}
