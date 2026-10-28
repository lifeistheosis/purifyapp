"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { VitrineImage } from "@/components/shop/VitrineImage";
import { Search } from "@/components/ui/icons/Search";
import { cn } from "@/lib/cn";
import { useIsNative } from "@/lib/platform/native";
import { productHref } from "@/lib/shop/productHref";
import type { ShopProductFull } from "@/lib/shop/types";

/**
 * The top of the shop's front page, as the owner picked it (round 11 of the
 * 1.8 designs, B "By saint", locked 2026-10-27): one card, the shop's promise
 * on one side and one featured icon on the other. It took the place of the
 * masthead and its three vitrines.
 *
 * The icon is chosen by rule, never by hand (lib/shop/featured.ts), and opens
 * its own page; the picture is named by the piece's title for a screen reader.
 * Until the catalogue has answered, its place is held, so the card never
 * shows one icon and then swaps it for another.
 *
 * The words are the shop's own: its line, its promise, "Browse the shop", and
 * the search that was beside it. On a phone the icon's half is a little
 * narrower than drawn, so the button and the search keep one line in English;
 * in a language whose button is longer the search steps under it rather than
 * over the icon. Both are 44px tall, the app's touch floor
 * (lib/ui/__tests__/touchTargets.test.ts), where the drawing had 40.
 */
export function FeaturedIcon({
  icon,
  waiting,
  className,
}: {
  icon: ShopProductFull | null;
  /** The catalogue is still on its way: hold the icon's place. */
  waiting: boolean;
  className?: string;
}) {
  const { t } = useTranslate();
  const native = useIsNative();
  const image = icon?.media[0];
  const side = Boolean(image) || waiting;

  return (
    <section
      aria-labelledby="shop-featured"
      className={cn(
        "shop-feature relative overflow-hidden rounded-[22px] ring-1 ring-inset ring-paper/[0.07] md:rounded-card",
        className,
      )}
    >
      <div
        className={cn(
          "grid min-h-[220px] md:min-h-[26rem]",
          side && "grid-cols-[minmax(0,1fr)_clamp(7.5rem,38%,10rem)] md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]",
        )}
      >
        <div className="flex flex-col justify-between gap-4 pb-[18px] pe-1 ps-[18px] pt-[22px] md:gap-8 md:p-12 lg:p-14">
          <div>
            <h1
              id="shop-featured"
              className="title-in text-balance font-heading text-[23px] font-bold leading-[1.15] tracking-[-0.01em] text-paper md:text-display-sm md:leading-[1.06] lg:text-display"
            >
              {t("shop.iconsForTheLifeOf")}
            </h1>
            <p className="mt-2 max-w-[36ch] text-pretty font-sans text-detail leading-[1.45] text-paper/70 md:mt-4 md:font-serif md:text-lede md:leading-[1.55]">
              {t("shop.curatedOrthodoxIconsFaithfulTo")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:gap-2.5">
            <Link
              href="/shop/category/all"
              className="tap-press inline-flex min-h-11 max-w-full items-center justify-center rounded-pill bg-paper px-4 py-2 text-center font-sans text-ui font-semibold leading-tight text-night transition-colors hover:bg-paper/90 md:min-h-12 md:px-7"
            >
              {t("shop.browseIcons")}
            </Link>
            <Link
              href="/shop/category/all"
              aria-label={t("shop.searchTheShop")}
              className="tap-press inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-paper/20 text-paper/75 transition-colors hover:border-paper/45 hover:text-paper md:size-12"
            >
              <Search size={18} />
            </Link>
          </div>
        </div>

        {icon && image ? (
          <Link
            href={productHref(icon.slug, native)}
            aria-label={icon.title}
            className="group relative block min-h-0"
          >
            <VitrineImage
              src={image.media_url}
              alt=""
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1200px) 540px, (min-width: 768px) 45vw, 160px"
              className="shop-feature-icon object-contain py-2.5 drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)] transition-transform duration-700 ease-house group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 md:p-10"
            />
          </Link>
        ) : waiting ? (
          <div aria-hidden className="py-2.5 pe-2.5 md:p-10">
            <div className="h-full animate-pulse rounded-xl bg-paper/[0.05] motion-reduce:animate-none" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
