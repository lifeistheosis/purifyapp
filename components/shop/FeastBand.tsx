"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useIsNative } from "@/lib/platform/native";
import { bannerFeast } from "@/lib/shop/feasts";
import { formatPrice } from "@/lib/shop/format";
import { productHref } from "@/lib/shop/productHref";
import type { ShopProductFull } from "@/lib/shop/types";

/**
 * The feast the shop is getting ready for (lib/shop/feasts.ts): in the three
 * weeks before a great feast, when the shop has a piece that matches it, the
 * shop home carries the feast's name, its day and those pieces. Most of the
 * year there is no such feast and this renders nothing.
 *
 * The name is the calendar's, in the calendar's own words, and like the
 * calendar's commemorations it is not translated here; the day and the words
 * around it are the reader's language. Nothing is said about the feast
 * beyond its name and its day.
 *
 * Rendered only after the catalogue has loaded, on the client, so the date
 * it reads is the reader's and never a stale server's.
 */
export function FeastBand({ products, className }: { products: readonly ShopProductFull[]; className?: string }) {
  const { t, tn, locale } = useTranslate();
  const native = useIsNative();
  const [now] = useState(() => new Date());
  const banner = bannerFeast(now, products);
  if (!banner) return null;

  const date = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
    banner.date,
  );
  const when = banner.days === 0 ? t("shop.feastToday", { date }) : tn("shop.feastInDays", banner.days, { date });
  const pieces = banner.pieces.slice(0, 2);

  return (
    <section
      aria-labelledby="shop-feast"
      className={className}
    >
      <div className="dark-island relative overflow-hidden rounded-2xl bg-[#0a0a0a] p-5 text-paper ring-1 ring-inset ring-[#c9a25a]/25 md:flex md:items-center md:justify-between md:gap-10 md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 80% at 15% 20%, rgba(201,162,90,0.16), transparent 70%)" }}
        />
        <div className="relative max-w-[40ch]">
          <h2 id="shop-feast" className="text-balance text-title-sm leading-snug text-[#f3ead6] md:text-title">
            {banner.feast.name}
          </h2>
          <p className="mt-2 font-sans text-detail font-semibold text-[#e2c68b]">{when}</p>
          <p className="mt-3 font-serif text-body text-paper/65">{t("shop.feastPieces")}</p>
        </div>
        <ul className="relative mt-5 grid grid-cols-2 gap-3 md:mt-0 md:w-[26rem] md:shrink-0">
          {pieces.map((p) => {
            const image = p.media[0];
            return (
              <li key={p.id} className={pieces.length === 1 ? "col-span-2" : undefined}>
                <Link href={productHref(p.slug, native)} className="group flex items-center gap-3 rounded-xl bg-[#141414] p-2.5 ring-1 ring-inset ring-[#c9a25a]/15 transition-[box-shadow] hover:ring-[#c9a25a]/45">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg">
                    {image ? <Image src={image.media_url} alt={image.alt_text} fill sizes="64px" className="object-contain p-1" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-sans text-caption leading-snug text-paper/85 group-hover:text-paper">{p.title}</p>
                    <p className="mt-1 font-sans text-caption font-semibold tabular-nums text-[#f3ead6]">
                      {formatPrice(p.price_cents, p.currency)}
                    </p>
                    <p className="mt-1 font-sans text-caption font-medium text-[#e2c68b]">{t("shop.feastSee")}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
