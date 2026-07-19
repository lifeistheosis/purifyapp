"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/shop/ProductCard";
import { ShopBrowseControls } from "@/components/shop/ShopBrowseControls";
import { ShopError, ShopGridSkeleton } from "@/components/shop/ShopStates";
import { filterProducts, type BrowseFilters } from "@/lib/shop/browse";
import { fetchShopProducts } from "@/lib/shop/catalogClient";
import { CATEGORY_LABELS } from "@/lib/shop/format";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import type { ShopCategory } from "@/lib/shop/types";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * NOTE: this reads ?q= / ?inventory= from window.location in a mount effect
 * rather than next/navigation's useSearchParams(). In the local-first static
 * export, a useSearchParams() call forces a client-side-rendering bailout
 * under its Suspense boundary and the whole component fails to hydrate — the
 * products fetch never fires and the page sits on its skeleton forever (this
 * was live-broken on prod /shop/category/*). Reading the URL directly keeps
 * the component a plain, always-hydrating client component.
 */
export function CategoryClient({ category }: { category: string }) {
  const { t } = useTranslate();
  const isAll = category === "all";
  const valid = isAll || category in CATEGORY_LABELS;

  const [filters, setFilters] = useState<BrowseFilters>({ q: "" });

  // Seed filters from the URL once, on the client, after mount. Deep links
  // like ?q=nicholas or ?inventory=ready_to_ship still work; typing afterward
  // is pure local state (no history spam). One-time URL read, same hydration
  // pattern as FavoriteButton's mounted gate.
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") ?? "";
    const readyOnly = params.get("inventory") === "ready_to_ship";
    if (q || readyOnly) setFilters({ q, readyOnly });
  }, []);

  const { data, error, loading, reload } = useAsyncData(
    () =>
      valid
        ? fetchShopProducts({
            category: isAll ? undefined : (category as ShopCategory),
            // readyOnly is applied client-side so toggling it in the sheet is
            // instant; the URL param is honoured on arrival for deep links.
            limit: 60,
          })
        : Promise.resolve([]),
    [category],
  );

  const shown = useMemo(
    () => (data ? filterProducts(data, filters) : []),
    [data, filters],
  );

  const title = isAll
    ? filters.readyOnly
      ? "Ready to Ship"
      : "All icons"
    : CATEGORY_LABELS[category as ShopCategory];

  const categories = Object.entries(CATEGORY_LABELS) as [ShopCategory, string][];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
      <header className="pt-8 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          {t("shop.purifyShop")}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="font-display-serif text-heading md:text-display-sm text-paper">
            {valid ? title : "Category"}
          </h1>
          {data && !loading ? (
            <p aria-live="polite" className="font-sans text-caption text-paper/50">
              {shown.length} {shown.length === 1 ? "icon" : "icons"}
            </p>
          ) : null}
        </div>
      </header>

      {/* Category switcher: a snap carousel with the current page selected. */}
      <nav aria-label={t("shop.browseByCategory")} className="mt-5 -mx-5 md:mx-0">
        <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-thin px-5 pb-1 md:px-0">
          {[["all", "All"] as [string, string], ...categories].map(([slug, label]) => {
            const active = slug === category;
            return (
              <li key={slug} className="shrink-0 snap-start">
                <Link
                  href={`/shop/category/${slug}`}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "tap-press inline-flex min-h-[40px] items-center rounded-pill border border-gold bg-gold px-4 font-sans text-detail font-semibold text-night"
                      : "tap-press inline-flex min-h-[40px] items-center rounded-pill border border-paper/15 bg-paper/[0.03] px-4 font-sans text-detail font-medium text-paper/75 hover:border-paper/35 hover:text-paper"
                  }
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4">
        <ShopBrowseControls
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            // Keep shareable URLs honest: once the reader edits filters, drop
            // the stale ?q= / ?inventory= params so a refresh doesn't lie.
            // history.replaceState avoids a navigation (and the Suspense
            // bailout that useRouter/useSearchParams would reintroduce).
            if (window.location.search) {
              window.history.replaceState(null, "", `/shop/category/${category}`);
            }
          }}
          resultCount={shown.length}
        />
      </div>

      {loading ? <ShopGridSkeleton /> : null}
      {error ? <ShopError message={error} onRetry={reload} /> : null}

      {data && shown.length > 0 ? (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {shown.map((p, i) => (
            <li key={p.id} className="rise-in" style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      ) : null}

      {data && data.length > 0 && shown.length === 0 && !loading ? (
        <div className="mt-10 text-center">
          <p className="font-serif text-body text-paper/60">
            {t("shop.nothingMatchesThoseFilters")}
          </p>
          <button
            type="button"
            onClick={() => setFilters({ q: "" })}
            className="tap-press mt-4 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
          >
            {t("shop.clearFilters")}
          </button>
        </div>
      ) : null}

      {data && data.length === 0 && !loading ? (
        <p className="mt-8 font-serif text-body text-paper/60">
          {t("shop.nothingHereYetIfYou")}{" "}
          <Link href="/shop/request" className="text-gold underline underline-offset-4">
            {t("shop.requestIt")}
          </Link>{" "}
          {t("shop.andWeLlLookFor")}
        </p>
      ) : null}
    </div>
  );
}
