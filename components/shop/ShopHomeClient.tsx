"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";

import { CategoryChips } from "@/components/shop/CategoryChips";
import { FeastBand } from "@/components/shop/FeastBand";
import { FeaturedIcon } from "@/components/shop/FeaturedIcon";
import { NewPiecesSignup } from "@/components/shop/NewPiecesSignup";
import { PrayerCornerSet } from "@/components/shop/PrayerCornerSet";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopBySaint } from "@/components/shop/ShopBySaint";
import { ShopError, ShopGridSkeleton } from "@/components/shop/ShopStates";
import { StoreDoor } from "@/components/shop/StoreDoor";
import { VitrineImage } from "@/components/shop/VitrineImage";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Lock } from "@/components/ui/icons/Lock";
import { Seal } from "@/components/ui/icons/Seal";
import { Truck } from "@/components/ui/icons/Truck";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import { useIsNative } from "@/lib/platform/native";
import { shopSaints } from "@/lib/shop/bySaint";
import {
  fetchShopConfig,
  fetchShopHome,
  fetchShopProducts,
  peekShopConfig,
  peekShopHome,
  peekShopProducts,
} from "@/lib/shop/catalogClient";
import { featuredIcon, newIn } from "@/lib/shop/featured";
import { CATEGORY_LABELS, formatPrice } from "@/lib/shop/format";
import { productHref } from "@/lib/shop/productHref";
import { useRecentlyViewed } from "@/lib/shop/recentlyViewed";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import type { ShopCategory, ShopProductFull } from "@/lib/shop/types";

/**
 * The shop's front page, redrawn 2026-09-30 (the owner: "revamp the entire
 * shop designs ... look nice and up retention and sales", direction "elevate
 * the dark look"), and again for 1.8 as the owner picked it from three
 * (round 11, B "By saint", locked 2026-10-27): "one featured icon, then Shop
 * by saint, then what is new".
 *
 * What it leads with now, and why:
 *
 *   - One featured icon (components/shop/FeaturedIcon.tsx) in the masthead's
 *     place: the shop's promise beside one icon picked by rule
 *     (lib/shop/featured.ts). It replaced the three vitrines.
 *   - Shop by saint (components/shop/ShopBySaint.tsx): the saints the shop's
 *     pieces carry, read from the catalogue (lib/shop/bySaint.ts), each one
 *     opening his pieces, and from there his life.
 *   - New in: the newest pieces, four of them.
 *
 * Kept from 2026-09-30, below those: the reasons to buy here (free shipping
 * over the owner's threshold, read live from the shop settings and never
 * typed; Stripe's checkout; sellers approved by hand), the feast the shop is
 * getting ready for, what a returning reader last looked at and saved, the
 * rest of the collection with its kinds, the prayer corner set, new pieces by
 * email, the stores as doorways, and the ways to request and to sell.
 *
 * Each piece still appears once: the collection leaves out what the featured
 * icon and New in already show. Every section renders only with real
 * content: no fabricated counts, no empty shells.
 */

/** In hand first, then made to order, then coming, then gone. */
const AVAILABILITY_ORDER = { ready_to_ship: 0, special_order: 1, coming_soon: 2, out_of_stock: 3 } as const;

function byAvailability(a: ShopProductFull, b: ShopProductFull): number {
  return AVAILABILITY_ORDER[a.inventory_status] - AVAILABILITY_ORDER[b.inventory_status];
}

/**
 * The catalogue whole, as far as one read goes (the newest sixty, the API's
 * ceiling): the same read the cart and a product page make, so it is often
 * in memory already.
 */
const CATALOGUE = { limit: 60 };

/** How many pieces New in shows: two rows on a phone, one on a computer. */
const NEW_IN = 4;

export function ShopHomeClient() {
  const { t } = useTranslate();
  // Both start from the last answer this visit when there is one, so a
  // reader coming back to the shop sees the shop at once (useAsyncData).
  const { data, error, loading, reload } = useAsyncData(fetchShopHome, [], peekShopHome);
  const { data: config, loading: configLoading } = useAsyncData(fetchShopConfig, [], peekShopConfig);
  // Shop by saint and the featured icon are read from the whole catalogue,
  // not from the home's few lists: the home carries the newest pieces, and a
  // saint whose icons are older would be missing from the row.
  const { data: pool, error: poolError } = useAsyncData(
    () => fetchShopProducts(CATALOGUE),
    [],
    () => peekShopProducts(CATALOGUE),
  );

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

  // Nothing is picked until the catalogue has answered, so the featured icon
  // is never swapped for another under the reader's eye, and New in and the
  // collection, which leave it out, wait for it too. When it cannot be read,
  // the home's own pieces stand in.
  const catalogue = pool ?? (poolError ? collection : null);
  const settled = catalogue !== null;
  const featured = useMemo(() => (catalogue ? featuredIcon(catalogue) : null), [catalogue]);
  const saints = useMemo(() => (catalogue ? shopSaints(catalogue) : []), [catalogue]);
  const fresh = useMemo(
    () => newIn(collection, NEW_IN, featured ? [featured.slug] : []),
    [collection, featured],
  );
  const rest = useMemo(() => {
    const above = new Set([...(featured ? [featured.slug] : []), ...fresh.map((p) => p.slug)]);
    return collection.filter((p) => !above.has(p.slug));
  }, [collection, featured, fresh]);

  // What this device opened before, re-read from the live catalogue so the
  // prices and pictures are today's.
  const recentSlugs = useRecentlyViewed();
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
  const categories = (Object.keys(CATEGORY_LABELS) as ShopCategory[]).filter(
    (c) => !counts || (counts[c] ?? 0) > 0,
  );

  // A store's door shows three of its own pieces, the featured icon last
  // where it has others.
  function doorPieces(storeSlug: string): ShopProductFull[] {
    const own = collection.filter((p) => p.store.slug === storeSlug && p.media.length > 0);
    return [...own.filter((p) => p.slug !== featured?.slug), ...own.filter((p) => p.slug === featured?.slug)];
  }
  const threshold = config?.freeShippingThresholdCents ?? null;

  return (
    <div className="mx-auto w-full max-w-[1200px] md:px-8">
      {/* ── One featured icon ──────────────────────────────────────────── */}
      <FeaturedIcon icon={featured} waiting={!settled} className="mx-5 mt-3 md:mx-0 md:mt-10" />

      {/* ── Shop by saint ─────────────────────────────────────────────── */}
      <ShopBySaint saints={saints} waiting={!settled} className="mt-5 md:mt-14" />

      {loading || (!settled && !error) ? <NewInBones /> : null}
      {error ? <ShopError message={error} onRetry={reload} /> : null}

      {/* ── New in ────────────────────────────────────────────────────── */}
      {settled && fresh.length > 0 ? (
        <section aria-labelledby="shop-new-in" className="mt-5 md:mt-14">
          <div className="flex items-baseline justify-between gap-4 px-5 md:px-0">
            <h2 id="shop-new-in" className="font-heading text-[20px] font-semibold leading-tight text-paper md:text-title">
              {t("shop.newIn")}
            </h2>
            <Link
              href="/shop/category/all"
              className="inline-flex min-h-11 shrink-0 items-center font-sans text-detail font-medium text-paper/55 transition-colors hover:text-paper motion-reduce:transition-none"
            >
              {t("common.seeAll")}
            </Link>
          </div>
          <ul className="mt-1 grid grid-cols-2 gap-x-3.5 gap-y-8 px-5 md:gap-x-6 md:px-0 lg:grid-cols-4">
            {fresh.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Why buy here ──────────────────────────────────────────────── */}
      {/* Each line is something the code guarantees: the threshold is the
          live shop setting, checkout is Stripe's hosted page, and every
          seller is approved by hand. It stood under the masthead's buttons
          until 1.8; the featured card holds only its promise now. */}
      <ul className="mx-5 mt-10 grid max-w-[560px] grid-cols-3 gap-3 border-y border-paper/10 py-4 md:mx-0 md:mt-14">
        {threshold && threshold > 0 ? (
          <TrustItem icon={<Truck size={18} />}>
            {t("shop.freeShippingOver", { amount: formatPrice(threshold) })}
          </TrustItem>
        ) : configLoading ? (
          // Its place is held while the shop's settings are read. Without
          // this the other two stood in the first two columns and jumped
          // one to the right when this arrived.
          <li aria-hidden className="flex flex-col gap-1.5">
            <span className="size-[18px] animate-pulse rounded bg-paper/[0.06] motion-reduce:animate-none" />
            <span className="h-3 w-4/5 animate-pulse rounded bg-paper/[0.06] motion-reduce:animate-none" />
            <span className="h-3 w-1/2 animate-pulse rounded bg-paper/[0.06] motion-reduce:animate-none" />
          </li>
        ) : null}
        <TrustItem icon={<Lock size={18} />}>{t("shop.trustStripeCheckout")}</TrustItem>
        <TrustItem icon={<Seal size={18} />}>{t("shop.trustSellersReviewed")}</TrustItem>
      </ul>

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
          <ScrollRail as="ul" snap trackClassName="scroll-px-5 gap-3 px-5 md:scroll-px-0 md:px-0">
            {viewed.map((p) => (
              <li key={p.id} className="w-[7.25rem] md:w-[8.5rem]">
                <Thumb product={p} />
              </li>
            ))}
          </ScrollRail>
        </section>
      ) : null}

      {data ? (
        <>
          {/* ── The collection ─────────────────────────────────────────── */}
          {/* The rest of the pieces, each once: what the featured icon and
              New in already show is left out. */}
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

              {/* Browse by kind: only kinds with something in them, each
                  with how many pieces it holds. The wrapper carries the
                  page's gutter so the row can bleed to the screen's edge. */}
              <div className="mt-3 px-5 md:px-0">
                <CategoryChips categories={categories} counts={counts} lead />
              </div>

              {settled && rest.length > 0 ? (
                <ul className="mt-6 grid grid-cols-2 gap-x-3.5 gap-y-8 px-5 sm:grid-cols-3 md:gap-x-6 md:gap-y-12 md:px-0 lg:grid-cols-4">
                  {rest.map((p) => (
                    <li key={p.id}>
                      <ProductCard product={p} />
                    </li>
                  ))}
                </ul>
              ) : null}
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
          <p className="mt-3 font-sans text-detail font-semibold text-paper/80 group-hover:text-paper">
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
          <p className="mt-3 font-sans text-detail font-semibold text-paper/80 group-hover:text-paper">
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
      <span className="text-paper">{icon}</span>
      {children}
    </li>
  );
}

/** New in's place while the home is read: its heading and four cards. */
function NewInBones() {
  return (
    <div aria-hidden className="mt-5 px-5 md:mt-14 md:px-0">
      <Skeleton weight="strong" className="h-6 w-28 motion-reduce:animate-none" />
      <ShopGridSkeleton count={NEW_IN} />
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
      <div className="shop-vitrine relative aspect-[4/5] overflow-hidden rounded-xl ring-1 ring-inset ring-paper/[0.07] transition-[box-shadow] group-hover:ring-paper/30">
        {image ? (
          <VitrineImage src={image.media_url} alt="" fill sizes="136px" className="object-contain p-2.5" />
        ) : null}
      </div>
      <p className="mt-2 truncate font-sans text-caption text-paper/70">{product.title}</p>
      <p className="font-sans text-caption font-semibold tabular-nums text-paper">
        {formatPrice(product.price_cents, product.currency)}
      </p>
    </Link>
  );
}
