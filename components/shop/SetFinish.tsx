"use client";

import Image from "next/image";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PrayerRope } from "@/components/ui/icons/PrayerRope";
import { cn } from "@/lib/cn";
import { useIsNative } from "@/lib/platform/native";
import { addToCart } from "@/lib/shop/cart";
import { formatPrice } from "@/lib/shop/format";
import { productHref } from "@/lib/shop/productHref";
import type { ShopProductFull } from "@/lib/shop/types";

/**
 * Finishing a prayer corner set from the cart: the one or two pieces the
 * order still needs to hold an icon, a rope and a cross, and what adding them
 * takes off (lib/shop/cartOffers.ts setFinish). The saving is the order priced
 * again with them in it, by checkout's own function, so the button's number
 * is the Stripe page's number.
 *
 * In place of the order bump while it shows: one offer at a time.
 */
export function SetFinish({
  add,
  savingsCents,
  percent,
  currency,
  compact = false,
  onAdded,
  className,
}: {
  add: readonly ShopProductFull[];
  savingsCents: number;
  percent: number;
  currency: string;
  compact?: boolean;
  onAdded?: () => void;
  className?: string;
}) {
  const { t, tn } = useTranslate();
  const native = useIsNative();
  if (add.length === 0) return null;

  function addAll() {
    for (const p of add) {
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
    onAdded?.();
  }

  return (
    <section
      aria-labelledby={compact ? "set-finish-drawer" : "set-finish"}
      className={cn("rounded-xl border border-premium/25 bg-premium/[0.04]", compact ? "p-3" : "p-3.5", className)}
    >
      <h2
        id={compact ? "set-finish-drawer" : "set-finish"}
        className="flex items-center gap-2 font-sans text-detail font-semibold text-paper"
      >
        <PrayerRope size={16} className="shrink-0 text-premium-ink" aria-hidden />
        {t("shop.setFinishTitle")}
      </h2>
      <p className="mt-1 font-sans text-caption leading-[1.5] text-paper/65">{t("shop.setFinishBody", { percent })}</p>
      <ul className="mt-2.5 space-y-2">
        {add.map((p) => {
          const image = p.media[0];
          return (
            <li key={p.id} className="flex items-center gap-3">
              <Link
                href={productHref(p.slug, native)}
                className="shop-vitrine relative h-11 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-inset ring-paper/[0.07]"
              >
                {image ? <Image src={image.media_url} alt={image.alt_text} fill sizes="44px" className="object-contain p-1" /> : null}
              </Link>
              <Link
                href={productHref(p.slug, native)}
                className="min-w-0 flex-1 truncate font-sans text-caption text-paper/80 hover:text-paper"
              >
                {p.title}
              </Link>
              <span className="shrink-0 font-sans text-caption tabular-nums text-paper/60">
                {formatPrice(p.price_cents, p.currency)}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={addAll}
        className="tap-press mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-pill border border-premium/45 px-4 font-sans text-detail font-semibold text-paper hover:border-premium/70"
      >
        {tn("shop.setFinishAdd", add.length, { amount: formatPrice(savingsCents, currency) })}
      </button>
    </section>
  );
}
