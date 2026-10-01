"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";

import { FeastBand } from "@/components/shop/FeastBand";
import { NewPiecesSignup } from "@/components/shop/NewPiecesSignup";
import { PrayerCornerSet } from "@/components/shop/PrayerCornerSet";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopError, ShopHomeSkeleton } from "@/components/shop/ShopStates";
import { StoreDoor } from "@/components/shop/StoreDoor";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Lock } from "@/components/ui/icons/Lock";
import { Seal } from "@/components/ui/icons/Seal";
import { Search } from "@/components/ui/icons/Search";
import { Truck } from "@/components/ui/icons/Truck";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import { useIsNative } from "@/lib/platform/native";
import { fetchShopConfig, fetchShopHome, fetchShopProducts } from "@/lib/shop/catalogClient";
import { CATEGORY_LABELS, formatPrice } from "@/lib/shop/format";
import { productHref } from "@/lib/shop/productHref";
import { useRecentlyViewed } from "@/lib/shop/recentlyViewed";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import type { ShopCategory, ShopProductFull } from "@/lib/shop/types";

/**
 * The shop's front page, redrawn 2026-09-30 (the owner: "revamp the entire
 * shop designs ... look nice and up retention and sales", direction "elevate
 * the dark look").
 *
 * What changed, and why:
 *
 *   - The same eight pieces used to appear three times, as Featured, Ready to
 *     Ship and Recently Added, because all three rails read the same small
 *     catalogue. There is now one collection, each piece once, the ones in
 *     hand first.
 *   - The masthead leads with the pieces themselves: the promise on one side,
 *     three of them standing in lit vitrines on the other.
 *   - The reasons to buy here sit under the buttons, where the decision is
 *     made: free shipping over the owner's threshold (read live from the shop
 *     settings, never typed), Stripe's checkout, and sellers approved by hand.
 *   - A returning reader finds what they last looked at, and a way to what
 *     they saved, before anything else.
 *   - A store is shown as a doorway, in its own colours, with its own pieces.
 *
 * Every section still renders only with real content: no fabricated counts,
 * no empty shells.
 */

/** In hand first, then made to order, then coming, then gone. */
const AVAILABILITY_ORDER = { ready_to_ship: 0, special_order: 1, coming_soon: 2, out_of_stock: 3 } as const;

function byAvailability(a: ShopProductFull, b: ShopProductFull): number {
  return AVAILABILITY_ORDER[a.inventory_status] - AVAILABILITY_ORDER[b.inventory_status];
}

export function ShopHomeClient() {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(fetchShopHome, []);
  const { data: config } = useAsyncData(fetchShopConfig, []);

  // Each piece once. The home payload carries three overlapping lists; the
  // first appearance wins and the whole set is ordered by availability
  // (a stable sort, so the catalogue's own order holds within each group).
  const collection = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, ShopProductFull>();
    for (const p of [...data.featured, ...data.readyToShip, ...data.recent]) {
      if (!seen.has(p.slug)) seen.set(p.slug, p);
    }
    return [...seen.values()].sort(byAvailability);
  }, [data]);

  // What this device opened before, re-read from the live catalogue so the
  // prices and pictures are today's. Nothing is fetched for a first visit.
  const recentSlugs = useRecentlyViewed();
  const recentKey = recentSlugs.join(",");
  const { data: pool } = useAsyncData(
    () => (recentKey ? fetchShopProducts({ limit: 60 }) : Promise.resolve([])),
    [recentKey],
  );
  const bySlug = new Map((pool ?? []).map((p) => [p.slug, p]));
  const viewed = recentSlugs.flatMap((s) => {
    const p = bySlug.get(s);
    return p ? [p] : [];
  });
  const { bookmarks } = useBookmarks();
  const savedCount = bookmarks.filter((b) => b.kind === "product").length;

  // Only categories with something in them, once the home has said which.
  // Before it answers (or from an API too old to say), every chip shows, as
  // it always did.
  const counts = data?.categories;
  const categories = (Object.keys(CATEGORY_LABELS) as ShopCategory[])
    .filter((c) => !counts || (counts[c] ?? 0) > 0)
    .map((c) => [c, t(`shop.category.${c}`)] as [ShopCategory, string]);

  // The three pieces in the masthead: ones with a photograph, in hand first.
  const showcase = collection.filter((p) => p.media.length > 0).slice(0, 3);
  const inShowcase = new Set(showcase.map((p) => p.slug));
  // A store's door shows three of its own pieces, ones the masthead is not
  // already showing where it has them.
  function doorPieces(storeSlug: string): ShopProductFull[] {
    const own = collection.filter((p) => p.store.slug === storeSlug && p.media.length > 0);
    return [...own.filter((p) => !inShowcase.has(p.slug)), ...own.filter((p) => inShowcase.has(p.slug))];
  }
  const threshold = config?.freeShippingThresholdCents ?? null;

  return (
    <div className="mx-auto w-full max-w-[1200px] md:px-8">
      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <header className="relative px-5 pt-7 md:grid md:grid-cols-12 md:items-center md:gap-12 md:px-0 md:pt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[min(760px,100%)] -translate-x-1/2 rounded-full bg-premium/[0.06] blur-3xl md:left-[70%]"
        />
        <div className="relative md:col-span-5">
          <h1 className="title-in max-w-[13ch] text-balance font-heading text-display-sm leading-[1.04] tracking-[-0.015em] text-paper md:text-display-lg">
            {t("shop.iconsForTheLifeOf")}
          </h1>
          <p className="mt-3.5 max-w-[36ch] text-pretty font-serif text-body leading-[1.6] text-paper/70 md:mt-5 md:text-lede">
            {t("shop.curatedOrthodoxIconsFaithfulTo")}
          </p>

          <div className="mt-5 flex items-center gap-2.5 md:mt-7">
            <Link
              href="/shop/category/all"
              className="tap-press inline-flex min-h-12 items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
            >
              {t("shop.browseIcons")}
            </Link>
            <Link
              href="/shop/category/all"
              aria-label={t("shop.searchTheShop")}
              className="tap-press inline-flex h-12 w-12 items-center justify-center rounded-full border border-paper/20 text-paper/75 transition-colors hover:border-paper/45 hover:text-paper"
            >
              <Search size={19} />
            </Link>
          </div>

          {/* Why buy here, at the buttons. Each line is something the code
              guarantees: the threshold is the live shop setting, checkout is
              Stripe's hosted page, and every seller is approved by hand. */}
          <ul className="mt-6 grid max-w-[460px] grid-cols-3 gap-3 border-t border-paper/10 pt-4 md:mt-8">
            {threshold && threshold > 0 ? (
              <TrustItem icon={<Truck size={18} />}>
                {t("shop.freeShippingOver", { amount: formatPrice(threshold) })}
              </TrustItem>
            ) : null}
            <TrustItem icon={<Lock size={18} />}>{t("shop.trustStripeCheckout")}</TrustItem>
            <TrustItem icon={<Seal size={18} />}>{t("shop.trustSellersReviewed")}</TrustItem>
          </ul>
        </div>

        <div className="relative mt-7 md:col-span-7 md:mt-0">
          {showcase.length > 0 ? (
            <Showcase pieces={showcase} />
          ) : loading ? (
            <ShowcaseBones />
          ) : null}
        </div>
      </header>

      {loading ? <ShopHomeSkeleton /> : null}
      {error ? <ShopError message={error} onRetry={reload} /> : null}

      {/* ── A feast coming, when the shop has its icon (lib/shop/feasts.ts) ── */}
      {collection.length > 0 ? <FeastBand products={collection} className="mt-10 px-5 md:mt-14 md:px-0" /> : null}

      {/* ── Where they left off ─────────────────────────────────────── */}
      {viewed.length > 0 ? (
        <section aria-label={t("shop.recentlyViewed")} className="mt-12 md:mt-16">
          <div className="mb-3 flex items-baseline justify-between gap-4 px-5 md:px-0">
            <h2 className="font-heading text-title-sm text-paper">{t("shop.recentlyViewed")}</h2>
            {savedCount > 0 ? (
              <Link
                href="/saved"
                className="inline-flex min-h-11 items-center gap-1.5 font-sans text-detail font-medium text-paper/60 hover:text-paper"
              >
                {t("common.saved")}
                <span className="rounded-full bg-paper/10 px-1.5 font-semibold tabular-nums text-paper/80">{savedCount}</span>
              </Link>
            ) : null}
          </div>
          <ul className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto scrollbar-thin px-5 pb-1 md:scroll-px-0 md:px-0">
            {viewed.map((p) => (
              <li key={p.id} className="w-[7.25rem] shrink-0 snap-start md:w-[8.5rem]">
                <Thumb product={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data ? (
        <>
          {/* ── The collection ─────────────────────────────────────────── */}
          {collection.length > 0 ? (
            <section id="collection" aria-labelledby="shop-collection" className="mt-12 md:mt-20">
              <div className="flex items-baseline justify-between gap-4 px-5 md:px-0">
                <h2 id="shop-collection" className="font-heading text-title text-paper md:text-heading">
                  {t("shop.theCollection")}
                </h2>
                <Link
                  href="/shop/category/all"
                  className="inline-flex min-h-11 items-center font-sans text-detail font-medium text-paper/60 hover:text-paper"
                >
                  {t("common.seeAll")}
                </Link>
              </div>

              {/* Browse by kind: only kinds with something in them. */}
              <nav aria-label={t("shop.browseByCategory")} className="mt-3">
                <ul className="flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto scrollbar-thin px-5 pb-1 md:scroll-px-0 md:px-0">
                  <li className="shrink-0 snap-start">
                    <Link
                      href="/shop/category/all"
                      className="tap-press inline-flex min-h-11 items-center rounded-pill border border-premium/45 bg-premium/[0.08] px-4 font-sans text-detail font-semibold text-premium-ink hover:bg-premium/[0.14]"
                    >
                      {t("shop.everything")}
                    </Link>
                  </li>
                  {categories.map(([slug, label]) => (
                    <li key={slug} className="shrink-0 snap-start">
                      <Link
                        href={`/shop/category/${slug}`}
                        className="tap-press inline-flex min-h-11 items-center rounded-pill border border-paper/12 bg-paper/[0.03] px-4 font-sans text-detail font-medium text-paper/75 hover:border-paper/35 hover:text-paper"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <ul className="mt-6 grid grid-cols-2 gap-x-3.5 gap-y-8 px-5 sm:grid-cols-3 md:gap-x-6 md:gap-y-12 md:px-0 lg:grid-cols-4">
                {collection.map((p) => (
                  <li key={p.id} className="shop-rise">
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ── The prayer corner set (lib/shop/sets.ts) ─────────────────── */}
          <PrayerCornerSet
            products={collection}
            thresholdCents={threshold}
            promotions={config?.promotions}
            className="mx-5 mt-14 md:mx-0 md:mt-20"
          />

          {/* ── New pieces, by email ───────────────────────────────────── */}
          <NewPiecesSignup className="mt-14 px-5 md:mt-20 md:px-0" />

          {/* ── The stores ─────────────────────────────────────────────── */}
          {/* Every live store, oldest first, so EIKON keeps the front position
              it has by age rather than by being named in the source. `?? []`
              is not paranoia: this endpoint is served with max-age=30, so for
              half a minute after a deploy a browser can still be holding the
              previous shape. */}
          {(data.stores ?? []).length > 0 ? (
            <section aria-label={t("shop.theStores")} className="mt-16 px-5 md:mt-24 md:px-0">
              <ul className={cn("grid gap-4", (data.stores ?? []).length > 1 && "md:grid-cols-2")}>
                {(data.stores ?? []).slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <StoreDoor
                      store={s}
                      pieces={doorPieces(s.slug)}
                      wide={(data.stores ?? []).length === 1}
                    />
                  </li>
                ))}
              </ul>
              {(data.stores ?? []).length > 4 ? (
                <p className="mt-4 text-center">
                  <Link
                    href="/shop/stores"
                    className="inline-flex min-h-11 items-center font-sans text-detail font-medium text-paper/60 hover:text-paper"
                  >
                    {t("shop.allStores")}
                  </Link>
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

      {/* ── Request, and sell (static; always available) ─────────────── */}
      <section
        aria-label={t("shop.requestAnIcon")}
        className="mx-5 mt-16 grid border-y border-paper/10 md:mx-0 md:mt-24 md:grid-cols-2"
      >
        <Link href="/shop/request" className="group block py-7 md:py-9 md:pr-10">
          <h2 className="font-heading text-title-sm text-paper">{t("shop.lookingForASaintYou")}</h2>
          <p className="mt-2 max-w-[44ch] font-serif text-body leading-[1.6] text-paper/65">
            {t("shop.tellUsWhoYouRe")}
          </p>
          <p className="mt-3 font-sans text-detail font-semibold text-premium-ink group-hover:text-premium-bright">
            {t("shop.requestAnIconX")}
          </p>
        </Link>
        <Link
          href="/shop/sell"
          className="group block border-t border-paper/10 py-7 md:border-l md:border-t-0 md:py-9 md:pl-10"
        >
          <h2 className="font-heading text-title-sm text-paper">{t("shop.doYouMakeOrSell")}</h2>
          <p className="mt-2 max-w-[44ch] font-serif text-body leading-[1.6] text-paper/65">
            {t("shop.purifyIsOpeningACuratedX")}
          </p>
          <p className="mt-3 font-sans text-detail font-semibold text-premium-ink group-hover:text-premium-bright">
            {t("shop.sellOnPurifyX")}
          </p>
        </Link>
      </section>

      {/* Merchant disclosure */}
      <footer className="px-5 pt-6 md:px-0">
        <p className="font-sans text-caption text-paper/55">{t("shop.merchantsJoinPurifyShopBy")}</p>
      </footer>
    </div>
  );
}

function TrustItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-1.5 font-sans text-caption leading-[1.35] text-paper/65 md:text-detail">
      <span className="text-premium-ink">{icon}</span>
      {children}
    </li>
  );
}

/**
 * Three pieces in lit vitrines: one tall, two stacked beside it. Fewer
 * pieces, fewer vitrines, never a placeholder.
 */
function Showcase({ pieces }: { pieces: ShopProductFull[] }) {
  const [lead, ...rest] = pieces;
  if (pieces.length === 1) {
    return (
      <div className="h-[19rem] sm:h-[24rem] md:h-[34rem]">
        <ShowcaseTile product={lead} priority sizes="(min-width: 768px) 56vw, 100vw" className="h-full" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid h-[19rem] gap-3 sm:h-[24rem] md:h-[34rem] md:gap-4",
        pieces.length === 2 ? "grid-cols-2" : "grid-cols-[1.3fr_1fr] grid-rows-2",
      )}
    >
      <ShowcaseTile
        product={lead}
        priority
        sizes="(min-width: 768px) 32vw, 56vw"
        className={pieces.length > 2 ? "row-span-2" : undefined}
      />
      {rest.map((p) => (
        <ShowcaseTile key={p.id} product={p} sizes="(min-width: 768px) 24vw, 42vw" />
      ))}
    </div>
  );
}

function ShowcaseTile({
  product,
  priority,
  sizes,
  className,
}: {
  product: ShopProductFull;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  const native = useIsNative();
  const image = product.media[0];
  return (
    <Link
      href={productHref(product.slug, native)}
      className={cn(
        "shop-vitrine group relative block min-h-0 overflow-hidden rounded-2xl ring-1 ring-inset ring-paper/[0.07] transition-[box-shadow] duration-500 hover:ring-premium/45",
        className,
      )}
    >
      {image ? (
        <Image
          src={image.media_url}
          alt=""
          fill
          priority={priority}
          sizes={sizes}
          className="object-contain px-4 pb-14 pt-4 drop-shadow-[0_22px_26px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-house group-hover:scale-[1.04] md:px-6 md:pb-16 md:pt-6"
        />
      ) : null}
      <span className="absolute inset-x-3 bottom-3 flex flex-col font-sans text-caption leading-snug md:inset-x-4 md:bottom-4 md:text-detail">
        <span className="truncate text-paper/80">{product.title}</span>
        <span className="font-semibold tabular-nums text-paper">
          {formatPrice(product.price_cents, product.currency)}
        </span>
      </span>
    </Link>
  );
}

function ShowcaseBones() {
  return (
    <div aria-hidden className="grid h-[19rem] grid-cols-[1.3fr_1fr] grid-rows-2 gap-3 sm:h-[24rem] md:h-[34rem] md:gap-4">
      <div className="row-span-2 animate-pulse rounded-2xl bg-paper/[0.04]" />
      <div className="animate-pulse rounded-2xl bg-paper/[0.04]" />
      <div className="animate-pulse rounded-2xl bg-paper/[0.04]" />
    </div>
  );
}

/** A small piece in the "where you left off" row: the photograph and the
 *  price, the title in the link's name. */
function Thumb({ product }: { product: ShopProductFull }) {
  const native = useIsNative();
  const image = product.media[0];
  return (
    <Link href={productHref(product.slug, native)} className="group block" aria-label={product.title}>
      <div className="shop-vitrine relative aspect-[4/5] overflow-hidden rounded-xl ring-1 ring-inset ring-paper/[0.07] transition-[box-shadow] group-hover:ring-premium/45">
        {image ? (
          <Image src={image.media_url} alt="" fill sizes="136px" className="object-contain p-2.5" />
        ) : null}
      </div>
      <p className="mt-2 truncate font-sans text-caption text-paper/70">{product.title}</p>
      <p className="font-sans text-caption font-semibold tabular-nums text-paper">
        {formatPrice(product.price_cents, product.currency)}
      </p>
    </Link>
  );
}
