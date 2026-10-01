"use client";

import { useEffect } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api/client";
import { BuyBar } from "@/components/shop/BuyBar";
import { BackInStockButton } from "@/components/shop/BackInStockButton";
import { CartDemandLine } from "@/components/shop/CartSignals";
import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { PolicyText } from "@/components/shop/PolicyText";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductRail } from "@/components/shop/ProductRail";
import { RatingStars } from "@/components/shop/RatingStars";
import { ReviewsSection } from "@/components/shop/ReviewsSection";
import { ShopDetailSkeleton, ShopError } from "@/components/shop/ShopStates";
import { EikonStory } from "@/components/shop/eikon/EikonStory";
import { PrayerCornerSet } from "@/components/shop/PrayerCornerSet";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Lock } from "@/components/ui/icons/Lock";
import { Truck } from "@/components/ui/icons/Truck";
import { isEikonProduct } from "@/lib/shop/eikon";
import { hasActiveProClient } from "@/lib/entitlements/client";
import { fetchShopConfig, fetchShopProduct, fetchShopProducts } from "@/lib/shop/catalogClient";
import {
  formatPrice,
  productRating,
  purchasable,
  unitsSoldLabel,
} from "@/lib/shop/format";
import type { PromoConfig } from "@/lib/shop/promotions";
import { rememberViewed } from "@/lib/shop/recentlyViewed";
import { stockUrgency } from "@/lib/shop/stock";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { useCartInsights } from "@/lib/shop/useCartInsights";
import type { ShopInventoryStatus, ShopProductDetail, ShopProductFull } from "@/lib/shop/types";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/** The classifications that are icons; everything else is devotional goods. */
const ICON_CLASSIFICATIONS: ReadonlySet<string> = new Set([
  "printed_mounted",
  "standard_reproduction",
  "laminated",
  "wooden",
  "hand_finished_reproduction",
]);

/** Catalog key for each availability status, so the chip reads in the
 *  visitor's language rather than the table's English. */
const INVENTORY_LABEL_KEYS: Record<ShopInventoryStatus, string> = {
  ready_to_ship: "shop.readyToShipX",
  special_order: "shop.specialOrder",
  coming_soon: "shop.comingSoon",
  out_of_stock: "shop.outOfStock",
};

/**
 * The dispatch window of lib/shop/format.dispatchWindowLabel, read out of the
 * catalog instead of the table so it lands in the visitor's language. Same
 * branching: weeks once the window reaches a fortnight, business days below
 * that, so a long window never reads like a delivery promise.
 */
function dispatchWindowMessage(
  t: (key: string, replacements?: Record<string, string | number>) => string,
  tn: (
    key: string,
    count: number,
    replacements?: Record<string, string | number>,
  ) => string,
  minDays: number,
  maxDays: number,
): string {
  if (maxDays >= 14) {
    const minW = Math.round(minDays / 7);
    const maxW = Math.ceil(maxDays / 7);
    if (minW >= 1 && minW !== maxW)
      return t("shop.dispatchWeekRange", { min: minW, max: maxW });
    return tn("shop.dispatchWeeks", maxW);
  }
  if (minDays === maxDays) return tn("shop.dispatchBusinessDays", minDays);
  return t("shop.dispatchDayRange", { min: minDays, max: maxDays });
}

function Fact({ term, value }: { term: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-6 border-b border-white/6 py-2.5 last:border-b-0">
      <dt className="shrink-0 font-sans text-detail text-paper/60">{term}</dt>
      <dd className="text-right font-sans text-detail text-paper/85">{value}</dd>
    </div>
  );
}

type Loaded = {
  detail: ShopProductDetail | null;
  checkoutEnabled: boolean;
  flatShippingCents: number;
  freeShippingThresholdCents: number | null;
  /** The shop's standing offers, for the set's price. */
  promotions: PromoConfig | null;
  pro: boolean;
  /** The catalogue, for the prayer corner set built around this piece. */
  catalogue: ShopProductFull[];
};

/**
 * Product detail, fetched live so it renders on the web and inside the native
 * shell alike. The page shell (server) supplies the slug + generateStaticParams;
 * this fetches the product, related icons, the resolved subject chips + saint
 * card, the public shop config (checkout on? flat shipping?), and the viewer's
 * Pro status for the shipping line.
 */
export function ProductDetailClient({ slug }: { slug: string }) {
  const { t, tn } = useTranslate();
  // How many OTHER shoppers hold this in a cart, counted by the server. Called
  // before the early returns below because it is a hook; it renders nothing
  // until there is a real count above zero.
  const { insights } = useCartInsights([slug]);
  const { data, error, loading, reload } = useAsyncData<Loaded>(async () => {
    const [detail, config, pro, catalogue] = await Promise.all([
      fetchShopProduct(slug).catch((e: unknown) => {
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      }),
      fetchShopConfig(),
      hasActiveProClient(),
      // Best effort: without it the page simply has no set.
      fetchShopProducts({ limit: 60 }).catch(() => [] as ShopProductFull[]),
    ]);
    return {
      detail,
      checkoutEnabled: config.checkoutEnabled,
      flatShippingCents: config.flatShippingCents,
      freeShippingThresholdCents: config.freeShippingThresholdCents ?? null,
      promotions: config.promotions ?? null,
      pro,
      catalogue,
    };
  }, [slug]);

  // Count one view per browser session per product (dedup here so refreshes
  // and re-renders never inflate the counter). Fire-and-forget; a failed
  // ping never affects the page.
  useEffect(() => {
    if (!slug) return;
    // For the shop home's "Recently viewed" rail. Device-local, slugs only.
    rememberViewed(slug);
    const key = `purify:viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: still ping once per mount */
    }
    void apiFetch("/api/shop/product-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }, [slug]);

  if (loading) {
    return <ShopDetailSkeleton />;
  }
  if (error) {
    return <ShopError message={error} onRetry={reload} />;
  }
  if (!data || data.detail === null) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
        <h1 className="text-heading text-paper">
          {t("shop.itemNotFound")}
        </h1>
        <p className="mt-3 font-serif text-body text-paper/70 leading-[1.6]">
          {t("shop.thisListingIsnTAvailable")}
        </p>
        <Link
          href="/shop"
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          {t("shop.backToTheShop")}
        </Link>
      </div>
    );
  }

  const { detail, checkoutEnabled, flatShippingCents, freeShippingThresholdCents, promotions, pro, catalogue } = data;
  const { product, related, chips, saint, storeShippingMd, storeReturnMd } =
    detail;

  const priceLabel = formatPrice(product.price_cents, product.currency);
  const shippingLabel = pro
    ? t("shop.freeShippingWithPurifyPro")
    : t("shop.standardShippingFreeWithPro", {
        price: formatPrice(flatShippingCents, product.currency),
      });
  const dispatchLabel = dispatchWindowMessage(
    t,
    tn,
    product.dispatch_min_days,
    product.dispatch_max_days,
  );
  const primaryImage = product.media[0];
  const rating = productRating(product);
  const sold = unitsSoldLabel(product.units_sold);
  // The card already says "Only 2 left"; the product page, where the decision
  // is actually made, did not. Same derivation, so it is exactly as true as
  // the stock count (lib/shop/stock.ts).
  const urgency = stockUrgency(product);
  const urgencyLabel = urgency.label
    ? urgency.level === "last"
      ? t("shop.lastOne")
      : tn("shop.onlyLeft", urgency.remaining ?? 0)
    : null;
  const inCarts = insights?.demand[product.slug];
  // An EIKON piece opens on its story (components/shop/eikon/EikonStory.tsx),
  // which carries the page's h1; the ordinary header below keeps its look
  // and becomes the h2 under it.
  const story = isEikonProduct(product) && product.media.length > 0;
  const TitleTag = story ? "h2" : "h1";

  return (
    // pb-44 clears the phone's fixed buy bar at the foot of the page.
    <div className="mx-auto w-full max-w-[1100px] px-5 pb-44 md:px-8 md:pb-8">
      <nav aria-label={t("shop.breadcrumb")} className="pt-6 font-sans text-caption text-paper/60">
        <Link href="/shop" className="hover:text-paper/75">
          {t("nav.shop")}
        </Link>
        {" / "}
        <Link href={`/shop/${product.store.slug}`} className="hover:text-paper/75">
          {product.store.public_name}
        </Link>
      </nav>

      {story ? (
        <div className="mt-4">
          <EikonStory product={product} />
        </div>
      ) : null}

      <div className={`${story ? "mt-12" : "mt-4"} gap-10 md:grid md:grid-cols-[minmax(0,1fr)_360px]`}>
        <div>
          <ProductGallery
            media={product.media}
            representative={product.image_is_representative}
            isIcon={ICON_CLASSIFICATIONS.has(product.classification)}
          />

          <header className="mt-6 md:mt-8">
            <div className="flex items-start justify-between gap-4">
              <TitleTag className="text-balance text-heading leading-[1.1] tracking-[-0.01em] text-paper md:text-display-sm">
                {product.title}
              </TitleTag>
              <FavoriteButton
                productSlug={product.slug}
                title={product.title}
                storeName={product.store.public_name}
                priceLabel={priceLabel}
                imageUrl={primaryImage?.media_url}
                imageAlt={primaryImage?.alt_text}
                className="mt-1 shrink-0"
              />
            </div>
            {product.subtitle ? (
              <p className="mt-2 font-serif text-lede text-paper/70">{product.subtitle}</p>
            ) : null}
            <p className="mt-2.5 font-sans text-detail text-paper/60">
              {t(`shop.classification.${product.classification}`)}
              {" · "}
              {t("shop.soldByX")}{" "}
              <Link
                href={`/shop/${product.store.slug}`}
                className="text-paper/80 underline underline-offset-4 hover:text-paper"
              >
                {product.store.public_name}
              </Link>
            </p>
            {inCarts ? (
              <div className="mt-2">
                <CartDemandLine count={inCarts} />
              </div>
            ) : null}
            {rating.count > 0 || sold ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {rating.count > 0 ? (
                  <RatingStars avg={rating.avg} count={rating.count} />
                ) : null}
                {sold ? (
                  <span className="font-sans text-caption text-paper/55">
                    {tn("shop.soldCount", product.units_sold ?? 0)}
                  </span>
                ) : null}
              </div>
            ) : null}
            {/* What a phone's slim buy bar leaves out, said once here:
                what shipping costs, when it leaves, and who takes the card.
                The sidebar says the same on md+. */}
            <ul className="mt-5 divide-y divide-paper/8 rounded-2xl border border-paper/10 px-4 md:hidden">
              <li className="flex items-center gap-3 py-3 font-sans text-detail text-paper/80">
                <Truck size={18} className="shrink-0 text-premium-ink" />
                {shippingLabel}
              </li>
              <li className="flex items-center gap-3 py-3 font-sans text-detail text-paper/80">
                <Calendar size={18} className="shrink-0 text-premium-ink" />
                {t(INVENTORY_LABEL_KEYS[product.inventory_status])} · {dispatchLabel}
              </li>
              {/* True as written: Buy now and the cart both open Stripe's
                  hosted checkout (components/shop/SecureCheckoutNote.tsx). */}
              {purchasable(product.inventory_status) && checkoutEnabled ? (
                <li className="flex items-center gap-3 py-3 font-sans text-detail text-paper/80">
                  <Lock size={18} className="shrink-0 text-premium-ink" />
                  {t("shop.trustStripeCheckout")}
                </li>
              ) : null}
            </ul>
            {chips.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {chips.map((c) =>
                  c.href ? (
                    <li key={c.label}>
                      <Link
                        href={c.href}
                        className="tap-press inline-flex min-h-[36px] items-center rounded-pill border border-gold/30 bg-gold/[0.06] px-3.5 font-sans text-detail text-gold hover:border-gold/50"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={c.label}
                      className="inline-flex min-h-[36px] items-center rounded-pill border border-paper/15 px-3.5 font-sans text-detail text-paper/70"
                    >
                      {c.label}
                    </li>
                  ),
                )}
              </ul>
            ) : null}
          </header>

          {product.description_md ? (
            <section aria-label={t("shop.description")} className="mt-8">
              <PolicyText text={product.description_md} />
            </section>
          ) : null}

          {/* The prayer corner set, built around this piece when it can take
              a place in one (lib/shop/sets.ts). Nothing for a flag or a ring. */}
          <PrayerCornerSet
            variant="compact"
            anchor={product}
            products={catalogue}
            thresholdCents={freeShippingThresholdCents}
            promotions={promotions}
            className="mt-8"
          />

          <section aria-label={t("shop.details")} className="mt-8 rounded-2xl border border-paper/10 bg-night-soft/60 p-5 md:p-6">
            <h2 className="text-title-sm text-paper">
              {t("shop.details")}
            </h2>
            <dl className="mt-3">
              <Fact term={t("shop.classificationLabel")} value={t(`shop.classification.${product.classification}`)} />
              <Fact term={t("shop.dimensions")} value={product.dimensions} />
              <Fact term={t("shop.materials")} value={product.materials} />
              <Fact term={t("shop.productionMethod")} value={product.production_method} />
              <Fact term={t("shop.madeBy")} value={product.maker_name} />
              <Fact term={t("shop.countryOfOrigin")} value={product.country_of_origin} />
              <Fact term={t("shop.availability")} value={t(INVENTORY_LABEL_KEYS[product.inventory_status])} />
              <Fact term={t("shop.estimatedDispatch")} value={dispatchLabel} />
            </dl>
          </section>

          {/* Shipping and returns */}
          {storeShippingMd || storeReturnMd ? (
            <section aria-label={t("shop.shippingAndReturns")} className="mt-6 rounded-2xl border border-paper/10 bg-night-soft/60 p-5 md:p-6">
              <h2 className="text-title-sm text-paper">
                {t("shop.shippingReturns")}
              </h2>
              {storeShippingMd ? (
                <div className="mt-3">
                  <PolicyText text={storeShippingMd} />
                </div>
              ) : null}
              {storeReturnMd ? (
                <div className="mt-4 border-t border-white/6 pt-4">
                  <PolicyText text={storeReturnMd} />
                </div>
              ) : null}
            </section>
          ) : null}

          {saint ? (
            <section aria-label={t("shop.aboutThisSaint")} className="mt-6">
              <Link
                href={`/saints/${saint.slug}`}
                className="press-card block rounded-2xl border border-paper/10 bg-night-soft/60 p-5 md:p-6"
              >
                <p className="font-heading text-title-sm text-paper">
                  {saint.name}
                </p>
                <p className="mt-0.5 font-sans text-caption text-paper/55">
                  {t("shop.fromThePurifyLibrary")}
                </p>
                <p className="mt-1 font-serif text-detail text-paper/65 leading-[1.6] line-clamp-2">
                  {saint.shortBio}
                </p>
                <p className="mt-2 font-sans text-detail font-medium text-gold">
                  {t("shop.readTheLife")}
                </p>
              </Link>
            </section>
          ) : null}
        </div>

        {/* Purchase column: the fixed bar on phones; on md+ a sidebar card
            that stays in view beside the details, the reviews and the
            policies as they scroll. */}
        <aside className="md:sticky md:top-24 md:self-start md:pt-1">
          <BuyBar
            productSlug={product.slug}
            title={product.title}
            priceCents={product.price_cents}
            currency={product.currency}
            imageUrl={primaryImage?.media_url}
            imageAlt={primaryImage?.alt_text}
            priceLabel={priceLabel}
            shippingLabel={shippingLabel}
            dispatchLabel={dispatchLabel}
            inventoryLabel={t(INVENTORY_LABEL_KEYS[product.inventory_status])}
            urgencyLabel={urgencyLabel}
            purchasable={purchasable(product.inventory_status)}
            checkoutOn={checkoutEnabled}
            subjectForRequest={product.title}
          />
          {product.inventory_status === "out_of_stock" ? <BackInStockButton productId={product.id} /> : null}
        </aside>
      </div>

      {/* Reviews (full width, below the two-column block). */}
      <div className="md:max-w-[calc(100%-400px)]">
        <ReviewsSection
          productId={product.id}
          productSlug={product.slug}
          productTitle={product.title}
          onReviewed={reload}
        />
      </div>

      <div className="mt-4 md:mt-10 -mx-5 md:mx-0">
        {/* "You may also like", not "Related icons": the rail carries beanies,
            flags and rings as well as icons, and the old title called all of
            them icons. */}
        <ProductRail title={t("shop.youMayAlsoLike")} products={related} />
      </div>
    </div>
  );
}
