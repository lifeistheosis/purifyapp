"use client";

import Image from "next/image";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { isEikonStore } from "@/lib/shop/eikon";
import type { ShopProductFull, ShopStore } from "@/lib/shop/types";

/**
 * A store as a doorway into it (2026-09-30), on the shop home and in the
 * store directory. EIKON is Purify's own collection and keeps the obsidian
 * and gold of its boutique (components/shop/eikon), so the door reads as the
 * room it opens into; any other store is drawn in the shop's own palette.
 * The pieces are the store's own, from the live catalogue, never a stock
 * picture.
 *
 * `details` adds where the store ships from and who runs it, for the
 * directory: a list of stores that does not say who runs each one is where
 * "sold by Purify" quietly becomes the assumption.
 */
export function StoreDoor({
  store,
  pieces,
  wide,
  details = false,
}: {
  store: ShopStore;
  pieces: ShopProductFull[];
  /** One store alone: the words beside the pieces on md+, not above them. */
  wide: boolean;
  details?: boolean;
}) {
  const { t } = useTranslate();
  const eikon = isEikonStore(store);
  const shown = pieces.filter((p) => p.media.length > 0).slice(0, 3);
  return (
    <Link
      href={`/shop/${store.slug}`}
      className={cn(
        "group relative block h-full overflow-hidden rounded-2xl p-6 transition-[box-shadow] duration-500 md:p-10",
        eikon
          ? "dark-island bg-[#0a0a0a] text-paper ring-1 ring-inset ring-[#c9a25a]/20 hover:ring-[#c9a25a]/50"
          : "bg-night-soft/60 ring-1 ring-inset ring-paper/10 hover:ring-paper/25",
        wide && "md:grid md:grid-cols-12 md:items-center md:gap-10",
      )}
    >
      {eikon ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(55% 60% at 80% 40%, rgba(201,162,90,0.13), transparent 72%)" }}
        />
      ) : null}
      <div className={cn("relative", wide && "md:col-span-5")}>
        {/* A heading, so Lora (app/globals.css sets every h1 to h6 in it,
            unlayered): EIKON's name in capitals reads as an inscription. */}
        <h2 className={cn("text-title", eikon ? "uppercase tracking-[0.3em] text-[#f3ead6]" : "text-paper")}>
          {store.public_name}
        </h2>
        {eikon ? (
          <div
            aria-hidden
            className="mt-4 h-px w-28"
            style={{ background: "linear-gradient(90deg, #c9a25a, #e2c68b 50%, transparent)" }}
          />
        ) : null}
        {store.tagline ? (
          <p className={cn("mt-4 font-serif text-lede italic", eikon ? "text-[#e2c68b]" : "text-paper/70")}>
            {store.tagline}
          </p>
        ) : null}
        {store.description ? (
          <p className="mt-3 line-clamp-3 max-w-[46ch] font-serif text-body leading-[1.65] text-paper/70">
            {store.description}
          </p>
        ) : null}
        {details ? (
          <div className="mt-4 space-y-1.5 font-sans text-caption leading-[1.5] text-paper/55">
            {store.shipping_origin ? (
              <p>
                {t("shop.shipsFrom")} {store.shipping_origin}
              </p>
            ) : null}
            <p>{store.ownership_disclosure}</p>
          </div>
        ) : null}
        <p
          className={cn(
            "mt-5 font-sans text-detail font-semibold",
            eikon ? "text-[#e2c68b] group-hover:text-[#efd9a3]" : "text-paper/80 group-hover:text-paper",
          )}
        >
          {t("shop.visitTheStore")}
        </p>
      </div>
      {shown.length > 0 ? (
        <ul aria-hidden className={cn("relative mt-7 grid grid-cols-3 gap-2.5 md:gap-4", wide && "md:col-span-7 md:mt-0")}>
          {shown.map((p) => (
            <li
              key={p.id}
              className={cn(
                "relative aspect-[4/5] overflow-hidden rounded-xl",
                eikon ? "bg-[#141414] ring-1 ring-inset ring-[#c9a25a]/10" : "shop-vitrine",
              )}
            >
              <Image
                src={p.media[0].media_url}
                alt=""
                fill
                sizes="(min-width: 768px) 18vw, 30vw"
                className="object-contain p-3 transition-transform duration-700 ease-house group-hover:scale-[1.04] md:p-4"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </Link>
  );
}
