"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SaintAvatar } from "@/components/shop/SaintAvatar";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { saintShopHref, type ShopSaintRow } from "@/lib/shop/bySaint";

/**
 * "Shop by saint", the shop home's second row in the owner's pick B (round 11
 * of the 1.8 designs, locked 2026-10-27): the saints the shop has pieces of,
 * each as his icon from the library in a circle with his name under it, read
 * from the catalogue (lib/shop/bySaint.ts). A saint opens the shop's pieces of
 * him, and that page opens his life in the reading room, so the shop and the
 * library are linked both ways.
 *
 * Only real saints of real pieces: with none, the row is not drawn at all.
 * "See all" opens the shop's saints, the kind every saint's icon is filed
 * under.
 *
 * The names are the library's, in its English, as the saints' pages and the
 * calendar write them in every language.
 */
export function ShopBySaint({
  saints,
  waiting,
  className,
}: {
  saints: ShopSaintRow[];
  /** The catalogue is still on its way: hold the row's place. */
  waiting: boolean;
  className?: string;
}) {
  const { t } = useTranslate();

  if (saints.length === 0) {
    if (!waiting) return null;
    return (
      <div aria-hidden className={cn("px-5 md:px-0", className)}>
        <Skeleton weight="strong" className="h-6 w-36 motion-reduce:animate-none" />
        <div className="mt-4 flex gap-3 overflow-hidden md:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-[76px] shrink-0 flex-col items-center md:w-[104px]">
              <Skeleton rounded="rounded-full" className="size-16 motion-reduce:animate-none md:size-[5.5rem]" />
              <Skeleton weight="faint" className="mt-2 h-3 w-12 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="shop-by-saint" className={className}>
      <div className="flex items-baseline justify-between gap-4 px-5 md:px-0">
        <h2 id="shop-by-saint" className="font-heading text-[20px] font-semibold leading-tight text-paper md:text-title">
          {t("shop.shopBySaint")}
        </h2>
        <Link
          href="/shop/category/saints"
          className="inline-flex min-h-11 shrink-0 items-center font-sans text-detail font-medium text-paper/55 transition-colors hover:text-paper motion-reduce:transition-none"
        >
          {t("common.seeAll")}
        </Link>
      </div>

      <ScrollRail as="ul" arrows={saints.length > 4} trackClassName="gap-3 px-5 pb-1 md:gap-5 md:px-0">
        {saints.map((saint) => (
          <li key={saint.slug} className="w-[76px] shrink-0 md:w-[104px]">
            <Link href={saintShopHref(saint.slug)} className="group flex flex-col items-center text-center">
              <SaintAvatar
                saint={saint}
                sizes="(min-width: 768px) 88px, 64px"
                className="size-16 md:size-[5.5rem]"
                imageClassName="transition-transform duration-500 ease-house group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
              <span
                lang="en"
                className="mt-1.5 line-clamp-2 hyphens-auto break-words font-sans text-caption font-semibold leading-[1.2] text-paper md:mt-2 md:text-detail"
              >
                {saint.shortName}
              </span>
            </Link>
          </li>
        ))}
      </ScrollRail>
    </section>
  );
}
