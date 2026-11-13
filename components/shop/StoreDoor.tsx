"use client";

import Image from "next/image";
import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { isEikonStore } from "@/lib/shop/eikon";
import type { ShopProductFull, ShopStore } from "@/lib/shop/types";

/**
 * A store as a doorway into it (2026-09-30), on the shop home and in the
 * store directory. Every door stands on the shop's own surfaces, tokens only,
 * so it is the reader's palette or look like every card around it; EIKON's
 * is the shop's featured surface (.shop-feature), its name in capitals and a
 * hairline under it. The door wore EIKON's obsidian until build 95 note 20
 * (his word, of the feast card in the same fixed colours: "this doesn't
 * match the them the users uses"); the room it opens into keeps it
 * (components/shop/eikon), and lib/ui/__tests__/lookSurfaces.test.ts names
 * that, with its reason.
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
          ? "shop-feature text-paper ring-1 ring-inset ring-paper/12 hover:ring-paper/30"
          : "bg-night-soft/60 ring-1 ring-inset ring-paper/10 hover:ring-paper/25",
        wide && "md:grid md:grid-cols-12 md:items-center md:gap-10",
      )}
    >
      <div className={cn("relative", wide && "md:col-span-5")}>
        {/* A heading, so Lora (app/globals.css sets every h1 to h6 in it,
            unlayered): EIKON's name in capitals reads as an inscription. */}
        <h2 className={cn("text-title", "text-paper")}>
          {store.public_name}
        </h2>
        {eikon ? (
          <div
            aria-hidden
            className="mt-4 h-px w-28"
            style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--color-paper) 55%, transparent), color-mix(in srgb, var(--color-paper) 28%, transparent) 50%, transparent)" }}
          />
        ) : null}
        {store.tagline ? (
          <p className={cn("mt-4 font-serif text-lede italic", eikon ? "text-paper/80" : "text-paper/70")}>
            {store.tagline}
          </p>
        ) : null}
        {store.description ? (
          <p className="mt-3 line-clamp-3 max-w-[46ch] font-serif text-body leading-[1.65] text-paper/70">
            {store.description}
          </p>
        ) : null}
        {/* The small print reads on every palette. The door stands on the
            shop's own surface now (.shop-feature), which on Candlelight and
            Monastery is a shade lighter than EIKON's old obsidian: the
            disclosure at text-paper/55 read 4.42:1 there (build 95 note 20,
            checkMock), so it is text-paper/80, held on all five palettes and
            the fifteen looks. */}
        {details ? (
          <div className="mt-4 space-y-1.5 font-sans text-caption leading-[1.5] text-paper/80">
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
            "text-paper/80 group-hover:text-paper",
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
                eikon ? "shop-vitrine ring-1 ring-inset ring-paper/[0.06]" : "shop-vitrine",
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
