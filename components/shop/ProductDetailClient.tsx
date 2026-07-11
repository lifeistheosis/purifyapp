"use client";

import Link from "next/link";

import { BuyBar } from "@/components/shop/BuyBar";
import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { PolicyText } from "@/components/shop/PolicyText";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductRail } from "@/components/shop/ProductRail";
import { RatingStars } from "@/components/shop/RatingStars";
import { ReviewsSection } from "@/components/shop/ReviewsSection";
import { ShopError, ShopLoading } from "@/components/shop/ShopStates";
import { hasActivePlusClient } from "@/lib/entitlements/client";
import { fetchShopConfig, fetchShopProduct } from "@/lib/shop/catalogClient";
import {
  CLASSIFICATION_LABELS,
  dispatchWindowLabel,
  formatPrice,
  INVENTORY_LABELS,
  productRating,
  purchasable,
  unitsSoldLabel,
} from "@/lib/shop/format";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import type { ShopProductDetail } from "@/lib/shop/types";

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
  plus: boolean;
};

/**
 * Product detail, fetched live so it renders on the web and inside the native
 * shell alike. The page shell (server) supplies the slug + generateStaticParams;
 * this fetches the product, related icons, the resolved subject chips + saint
 * card, the public shop config (checkout on? flat shipping?), and the viewer's
 * Plus status for the shipping line.
 */
export function ProductDetailClient({ slug }: { slug: string }) {
  const { data, error, loading, reload } = useAsyncData<Loaded>(async () => {
    const [detail, config, plus] = await Promise.all([
      fetchShopProduct(slug).catch((e: unknown) => {
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      }),
      fetchShopConfig(),
      hasActivePlusClient(),
    ]);
    return {
      detail,
      checkoutEnabled: config.checkoutEnabled,
      flatShippingCents: config.flatShippingCents,
      plus,
    };
  }, [slug]);

  if (loading) {
    return <ShopLoading label="Opening the icon…" />;
  }
  if (error) {
    return <ShopError message={error} onRetry={reload} />;
  }
  if (!data || data.detail === null) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
        <h1 className="font-display-serif text-heading text-paper">
          Icon not found
        </h1>
        <p className="mt-3 font-serif text-body text-paper/70 leading-[1.6]">
          This listing isn&rsquo;t available.
        </p>
        <Link
          href="/shop"
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          Back to the shop
        </Link>
      </div>
    );
  }

  const { detail, checkoutEnabled, flatShippingCents, plus } = data;
  const { product, related, chips, saint, storeShippingMd, storeReturnMd } =
    detail;

  const priceLabel = formatPrice(product.price_cents, product.currency);
  const shippingLabel = plus
    ? "Free shipping with Purify Plus"
    : `+ ${formatPrice(flatShippingCents, product.currency)} standard shipping · free with Purify Plus`;
  const dispatchLabel = dispatchWindowLabel(
    product.dispatch_min_days,
    product.dispatch_max_days,
  );
  const primaryImage = product.media[0];
  const rating = productRating(product);
  const sold = unitsSoldLabel(product.units_sold);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 pb-28 md:px-8 md:pb-8">
      <nav aria-label="Breadcrumb" className="pt-6 font-sans text-caption text-paper/60">
        <Link href="/shop" className="hover:text-paper/75">
          Shop
        </Link>
        {" / "}
        <Link href={`/shop/${product.store.slug}`} className="hover:text-paper/75">
          {product.store.public_name}
        </Link>
      </nav>

      <div className="mt-4 gap-10 md:grid md:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <ProductGallery
            media={product.media}
            representative={product.image_is_representative}
          />

          <header className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-pill border border-paper/20 bg-paper/[0.05] px-3 py-1 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/75">
                {CLASSIFICATION_LABELS[product.classification]}
              </span>
              <span className="rounded-pill border border-paper/15 px-3 py-1 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/60">
                {INVENTORY_LABELS[product.inventory_status]}
              </span>
            </div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <h1 className="font-display-serif text-heading md:text-display-sm leading-[1.1] text-paper">
                {product.title}
              </h1>
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
            <p className="mt-2 font-sans text-detail text-paper/60">
              Sold by{" "}
              <Link
                href={`/shop/${product.store.slug}`}
                className="text-paper/80 underline underline-offset-4 hover:text-paper"
              >
                {product.store.public_name}
              </Link>
            </p>
            {rating.count > 0 || sold ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {rating.count > 0 ? (
                  <RatingStars avg={rating.avg} count={rating.count} />
                ) : null}
                {sold ? (
                  <span className="font-sans text-caption text-paper/55">
                    {sold}
                  </span>
                ) : null}
              </div>
            ) : null}
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
            <section aria-label="Description" className="mt-8">
              <PolicyText text={product.description_md} />
            </section>
          ) : null}

          <section aria-label="Details" className="mt-8 rounded-lg border border-paper/10 bg-night-soft/60 p-5">
            <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
              Details
            </h2>
            <dl className="mt-3">
              <Fact term="Classification" value={CLASSIFICATION_LABELS[product.classification]} />
              <Fact term="Dimensions" value={product.dimensions} />
              <Fact term="Materials" value={product.materials} />
              <Fact term="Production method" value={product.production_method} />
              <Fact term="Made by" value={product.maker_name} />
              <Fact term="Country of origin" value={product.country_of_origin} />
              <Fact term="Availability" value={INVENTORY_LABELS[product.inventory_status]} />
              <Fact term="Estimated dispatch" value={dispatchLabel} />
            </dl>
          </section>

          {/* Shipping and returns */}
          {storeShippingMd || storeReturnMd ? (
            <section aria-label="Shipping and returns" className="mt-6 rounded-lg border border-paper/10 bg-night-soft/60 p-5">
              <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
                Shipping &amp; returns
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
            <section aria-label="About this saint" className="mt-6">
              <Link
                href={`/saints/${saint.slug}`}
                className="press-card block rounded-lg border border-paper/10 bg-night-soft/60 p-5"
              >
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
                  From the Purify library
                </p>
                <p className="mt-2 font-display-serif text-title-sm text-paper">
                  {saint.name}
                </p>
                <p className="mt-1 font-serif text-detail text-paper/65 leading-[1.6] line-clamp-2">
                  {saint.shortBio}
                </p>
                <p className="mt-2 font-sans text-detail font-medium text-gold">
                  Read the life →
                </p>
              </Link>
            </section>
          ) : null}
        </div>

        {/* Purchase column (sticky bar on phones, sidebar card on md+). */}
        <aside className="md:pt-1">
          <BuyBar
            productSlug={product.slug}
            priceLabel={priceLabel}
            shippingLabel={shippingLabel}
            dispatchLabel={dispatchLabel}
            inventoryLabel={INVENTORY_LABELS[product.inventory_status]}
            purchasable={purchasable(product.inventory_status)}
            checkoutOn={checkoutEnabled}
            subjectForRequest={product.title}
          />
        </aside>
      </div>

      {/* Reviews (full width, below the two-column block). */}
      <div className="md:max-w-[calc(100%-400px)]">
        <ReviewsSection
          productId={product.id}
          productSlug={product.slug}
          onReviewed={reload}
        />
      </div>

      <div className="mt-4 md:mt-10 -mx-5 md:mx-0">
        <ProductRail title="Related icons" products={related} />
      </div>
    </div>
  );
}
