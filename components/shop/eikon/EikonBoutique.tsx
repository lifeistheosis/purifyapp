"use client";

import Image from "next/image";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PolicyText } from "@/components/shop/PolicyText";
import { cn } from "@/lib/cn";
import { useIsNative } from "@/lib/platform/native";
import { formatPrice } from "@/lib/shop/format";
import { productHref } from "@/lib/shop/productHref";
import type { ShopProductFull, ShopStore } from "@/lib/shop/types";

/**
 * EIKON as a store within the store (the owner, 2026-09-30).
 *
 * The marketplace is a shop: a grid, filters, counts. EIKON is Purify's own
 * collection and is shown as one, on obsidian (#0a0a0a) with an antique gold
 * hairline, the pieces laid out as an editorial spread with room around them
 * instead of a grid of equal cards, and no filters or sorting at all.
 *
 * ── The arrival ─────────────────────────────────────────────────────────
 *
 * The obsidian ground fades in over the shop's own dark as the page opens,
 * and the gold rule draws itself across under the name, so crossing from the
 * marketplace reads as walking into another room. Opacity and a scaleX that
 * fill `backwards` only (lib/ui/__tests__/motionDoctrine.test.ts): nothing is
 * left holding a transform once it has played.
 *
 * ── The spread ──────────────────────────────────────────────────────────
 *
 * A repeating set of five placements on a twelve-column grid: one large
 * piece, one set low beside it, and three smaller ones stepped across the
 * width, so the eye travels instead of scanning rows. Two columns on a phone
 * with the same rhythm. Each piece rises into place as it scrolls up the
 * screen (CSS scroll-driven animation, `.eikon-rise` in app/globals.css),
 * where a browser supports it; elsewhere it simply sits there.
 *
 * `dark-island`: obsidian on every palette, the Light one included, with the
 * dark palette's tokens put back inside it (app/globals.css).
 */

const WIDE = [
  "md:col-span-7 md:col-start-1",
  "md:col-span-4 md:col-start-9 md:mt-40",
  "md:col-span-4 md:col-start-2",
  "md:col-span-5 md:col-start-7 md:mt-24",
  "md:col-span-6 md:col-start-4",
];
const NARROW = ["col-span-2", "col-span-1", "col-span-1 mt-16", "col-span-2 px-6", "col-span-1 mt-10", "col-span-1"];
const RATIO = ["aspect-[4/5]", "aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[5/4]"];

export function EikonBoutique({ store, products }: { store: ShopStore; products: ShopProductFull[] }) {
  const { t } = useTranslate();
  const native = useIsNative();
  // What can be bought first, then what is made to order, then what is coming.
  const order = { ready_to_ship: 0, special_order: 1, coming_soon: 2, out_of_stock: 3 } as const;
  const pieces = [...products].sort((a, b) => order[a.inventory_status] - order[b.inventory_status]);

  return (
    <div className="dark-island relative isolate min-h-screen pb-24 text-paper">
      <div aria-hidden className="eikon-veil-in pointer-events-none fixed inset-0 -z-10 bg-[#0a0a0a]">
        <div
          className="absolute inset-x-0 top-0 h-[75vh]"
          style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(201,162,90,0.14), transparent 72%)" }}
        />
      </div>

      <header className="mx-auto max-w-[760px] px-6 pb-16 pt-20 text-center md:pb-24 md:pt-28">
        <h1 className="font-sans text-display-sm font-semibold uppercase tracking-[0.38em] text-[#f3ead6] md:text-display">
          {store.public_name}
        </h1>
        <div
          aria-hidden
          className="eikon-rule-in mx-auto mt-6 h-px w-40"
          style={{ background: "linear-gradient(90deg, transparent, #c9a25a 30%, #e2c68b 50%, #c9a25a 70%, transparent)" }}
        />
        {store.tagline ? <p className="mt-6 font-serif text-lede italic text-[#e2c68b]">{store.tagline}</p> : null}
        {store.description ? (
          <p className="mx-auto mt-5 max-w-[34rem] text-pretty font-serif text-body leading-[1.7] text-paper/70">
            {store.description}
          </p>
        ) : null}
      </header>

      {pieces.length === 0 ? (
        <p className="px-6 text-center font-serif text-body text-paper/60">{t("shop.comingSoon")}</p>
      ) : (
        <ul className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-4 gap-y-14 px-5 md:grid-cols-12 md:gap-x-8 md:gap-y-24 md:px-8">
          {pieces.map((p, i) => {
            const image = p.media[0];
            return (
              <li key={p.id} className={cn(NARROW[i % NARROW.length], WIDE[i % WIDE.length], "md:mx-0 md:px-0")}>
                <Link href={productHref(p.slug, native)} className="eikon-rise group block">
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-[3px] bg-[#141414] ring-1 ring-inset ring-[#c9a25a]/10 transition-[box-shadow] duration-500 group-hover:ring-[#c9a25a]/45",
                      RATIO[i % RATIO.length],
                    )}
                  >
                    {image ? (
                      <Image
                        src={image.media_url}
                        alt={image.alt_text}
                        fill
                        sizes="(min-width: 768px) 50vw, 90vw"
                        className="object-cover transition-transform duration-[1200ms] ease-house group-hover:scale-[1.03]"
                      />
                    ) : null}
                  </div>
                  {/* Stacked on a phone, where half a screen is too narrow
                      to hold a title and a price side by side. */}
                  <div className="mt-4 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-4">
                    <h2 className="text-pretty font-serif text-lede leading-snug text-[#f3ead6]">{p.title}</h2>
                    <p className="shrink-0 font-sans text-detail tabular-nums tracking-[0.08em] text-[#e2c68b]">
                      {formatPrice(p.price_cents)}
                    </p>
                  </div>
                  {p.subtitle ? <p className="mt-1 font-serif text-detail italic text-paper/55">{p.subtitle}</p> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mx-auto mt-28 max-w-[640px] px-6 text-center">
        <div
          aria-hidden
          className="mx-auto h-px w-24"
          style={{ background: "linear-gradient(90deg, transparent, #c9a25a, transparent)" }}
        />
        {store.operational_disclosure ? (
          <div className="mt-8 font-serif text-detail leading-[1.7] text-paper/60">
            <PolicyText text={store.operational_disclosure} />
          </div>
        ) : null}
        <p className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 font-sans text-caption uppercase tracking-[0.18em]">
          <Link href="/shop/policies" className="inline-flex min-h-11 items-center text-paper/55 hover:text-[#e2c68b]">
            {t("shop.shippingRefundPolicy")}
          </Link>
          <Link href="/shop" className="inline-flex min-h-11 items-center text-paper/55 hover:text-[#e2c68b]">
            {t("shop.backToTheShop")}
          </Link>
        </p>
      </footer>
    </div>
  );
}
