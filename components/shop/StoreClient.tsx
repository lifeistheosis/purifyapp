"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PolicyText } from "@/components/shop/PolicyText";
import { ProductCard } from "@/components/shop/ProductCard";
import { RatingStars } from "@/components/shop/RatingStars";
import { ShopBrowseControls } from "@/components/shop/ShopBrowseControls";
import { ShopError, ShopGridSkeleton } from "@/components/shop/ShopStates";
import { StoreReviewsSection } from "@/components/shop/StoreReviewsSection";
import {
  activeFilterCount,
  filterProducts,
  type BrowseFilters,
} from "@/lib/shop/browse";
import { fetchShopStore } from "@/lib/shop/catalogClient";
import { CATEGORY_LABELS } from "@/lib/shop/format";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import type { ShopCategory, ShopProductFull, ShopStore } from "@/lib/shop/types";

function ProductGrid({
  title,
  products,
}: {
  title: string;
  products: ShopProductFull[];
}) {
  if (products.length === 0) return null;
  return (
    <section aria-label={title} className="mt-10">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="font-display-serif text-title md:text-heading text-paper">
          {title}
        </h2>
        <span className="font-sans text-caption text-paper/45">
          {products.length} {products.length === 1 ? "icon" : "icons"}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {products.map((p, i) => (
          <li key={p.id} className="rise-in" style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function contactHref(store: ShopStore): string {
  // The web /support/contact form is stashed out of the native export, so
  // prefer the store's support email (works everywhere) when it has one.
  return store.support_email
    ? `mailto:${store.support_email}`
    : "/support/contact";
}

export function StoreClient({ slug }: { slug: string }) {
  const { data, error, loading, reload } = useAsyncData(
    () =>
      fetchShopStore(slug).catch((e: unknown) => {
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      }),
    [slug],
  );
  // Declared before the early returns so hook order stays stable.
  const [filters, setFilters] = useState<BrowseFilters>({});
  const filtered = useMemo(
    () => filterProducts(data?.products ?? [], filters),
    [data, filters],
  );
  const isFiltering =
    Boolean(filters.q && filters.q.trim()) || activeFilterCount(filters) > 0;

  if (loading) return <div className="mx-auto w-full max-w-[1200px] px-5 pt-12 md:px-8"><ShopGridSkeleton /></div>;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (!data) {
    return (
      <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
        <h1 className="font-display-serif text-heading text-paper">
          Store not found
        </h1>
        <Link
          href="/shop"
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          Back to the shop
        </Link>
      </div>
    );
  }

  const { store, products } = data;
  const ready = products.filter((p) => p.inventory_status === "ready_to_ship");
  const special = products.filter((p) => p.inventory_status === "special_order");
  const upcoming = products.filter((p) => p.inventory_status === "coming_soon");
  const categoriesPresent = [
    ...new Set(products.map((p) => p.category)),
  ] as ShopCategory[];

  // Store rating = the average across every review of the store's products.
  // Summing rating_total / review_count keeps it exact (an average of averages
  // would not weight by review count).
  const storeReviewCount = products.reduce(
    (sum, p) => sum + (p.review_count ?? 0),
    0,
  );
  const storeRatingTotal = products.reduce(
    (sum, p) => sum + (p.rating_total ?? 0),
    0,
  );
  const storeAvg =
    storeReviewCount > 0 ? storeRatingTotal / storeReviewCount : null;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
      <header className="pt-12 text-center md:pt-20">
        <h1 className="font-display-serif text-display-sm md:text-display tracking-[0.14em] text-paper">
          {store.public_name.toUpperCase()}
        </h1>
        {store.tagline ? (
          <p className="mt-3 font-serif text-lede italic text-paper/70">
            {store.tagline}
          </p>
        ) : null}
        {store.description ? (
          <p className="mx-auto mt-5 max-w-[560px] font-serif text-body text-paper/70 leading-[1.65]">
            {store.description}
          </p>
        ) : null}

        <ul className="mx-auto mt-6 flex max-w-[640px] flex-wrap items-center justify-center gap-2">
          {[
            "Inspected by hand",
            store.shipping_origin ? `Ships from ${store.shipping_origin}` : null,
            "30-day returns",
          ]
            .filter((c): c is string => Boolean(c))
            .map((chip) => (
              <li
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-pill border border-paper/12 bg-paper/[0.03] px-3 py-1.5 font-sans text-caption text-paper/70"
              >
                <span aria-hidden className="text-gold">✓</span>
                {chip}
              </li>
            ))}
        </ul>
        {storeReviewCount > 0 ? (
          <div className="mt-3 flex justify-center">
            <RatingStars avg={storeAvg} count={storeReviewCount} />
          </div>
        ) : null}
      </header>

      {/* Search + facets over the store's own catalog. */}
      {products.length > 0 ? (
        <div className="mt-8">
          <ShopBrowseControls
            filters={filters}
            onChange={setFilters}
            resultCount={filtered.length}
            searchPlaceholder={`Search ${store.public_name}…`}
          />
        </div>
      ) : null}

      {/* Category quick-jumps (only when the store spans several). */}
      {categoriesPresent.length > 1 ? (
        <nav aria-label="Store categories" className="mt-6 -mx-5 md:mx-0">
          <ul className="flex snap-x gap-2 overflow-x-auto scrollbar-thin px-5 pb-1 md:justify-center md:px-0">
            {categoriesPresent.map((c) => (
              <li key={c} className="shrink-0 snap-start">
                <Link
                  href={`/shop/category/${c}`}
                  className="tap-press inline-flex min-h-[40px] items-center rounded-pill border border-paper/15 bg-paper/[0.03] px-4 font-sans text-detail font-medium text-paper/75 hover:border-paper/35 hover:text-paper"
                >
                  {CATEGORY_LABELS[c]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {/* When a search or facet is active, a single flat result grid reads
          clearer than three sparse sections. Otherwise, keep the curated
          availability sections. */}
      {isFiltering ? (
        filtered.length > 0 ? (
          <section aria-label="Results" className="mt-8">
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {filtered.map((p, i) => (
                <li key={p.id} className="rise-in" style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="mt-12 text-center">
            <p className="font-serif text-body text-paper/60">
              Nothing here matches those filters.
            </p>
            <button
              type="button"
              onClick={() => setFilters({})}
              className="tap-press mt-4 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
            >
              Clear filters
            </button>
          </div>
        )
      ) : (
        <>
          <ProductGrid title="Ready to Ship" products={ready} />
          <ProductGrid title="Special Order" products={special} />
          <ProductGrid title="Coming Soon" products={upcoming} />
        </>
      )}

      <section aria-label="How it works" className="mt-14 rounded-lg border border-paper/10 bg-night-soft/60 p-6 md:p-8">
        <h2 className="font-display-serif text-title text-paper">
          How {store.public_name} works
        </h2>
        {store.operational_disclosure ? (
          <p className="mt-3 font-serif text-body text-paper/70 leading-[1.65]">
            {store.operational_disclosure}
          </p>
        ) : null}
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {store.shipping_policy_md ? (
            <div>
              <h3 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
                Shipping
              </h3>
              <div className="mt-3">
                <PolicyText text={store.shipping_policy_md} />
              </div>
            </div>
          ) : null}
          {store.return_policy_md ? (
            <div>
              <h3 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
                Returns
              </h3>
              <div className="mt-3">
                <PolicyText text={store.return_policy_md} />
              </div>
            </div>
          ) : null}
        </div>
        <Link
          href={contactHref(store)}
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-semibold text-paper hover:border-paper/40"
        >
          Contact {store.public_name}
        </Link>
      </section>

      <StoreReviewsSection
        storeId={store.id}
        storeSlug={store.slug}
        storeName={store.public_name}
      />

      <footer className="mt-10 border-t border-white/8 pt-6 pb-4">
        <p className="font-sans text-caption text-paper/60">
          {store.ownership_disclosure}
        </p>
      </footer>
    </div>
  );
}
