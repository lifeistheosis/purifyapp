"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/shop/ProductCard";
import { ShopBrowseControls } from "@/components/shop/ShopBrowseControls";
import { ShopError, ShopGridSkeleton } from "@/components/shop/ShopStates";
import { filterProducts, type BrowseFilters } from "@/lib/shop/browse";
import { fetchShopHome, fetchShopProducts, peekShopHome } from "@/lib/shop/catalogClient";
import { CategoryChips } from "@/components/shop/CategoryChips";
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
  const { t, tn } = useTranslate();
  const isAll = category === "all";
  const valid = isAll || category in CATEGORY_LABELS;

  const [filters, setFilters] = useState<BrowseFilters>({ q: "" });

  // Seed filters from the URL once, on the client, after mount. Deep links
  // like ?q=nicholas or ?inventory=ready_to_ship still work; typing afterward
  // is pure local state (no history spam). One-time URL read, same hydration
  // pattern as FavoriteButton's mounted gate.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") ?? "";
    const readyOnly = params.get("inventory") === "ready_to_ship";
    // The disable belongs on the setState line, not on the useEffect line.
    // Sitting above the hook it silenced nothing the rule actually reports,
    // which is why this stayed a build-breaking error.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      ? t("shop.readyToShipX")
      : t("shop.everything")
    : t(`shop.category.${category}`);

  // Only kinds with something in them, as on the shop home, whose payload
  // carries the counts (and is usually already cached from the visit there).
  // Until it answers, or from an API too old to say, every chip shows.
  const { data: home } = useAsyncData(fetchShopHome, [], peekShopHome);
  const counts = home?.categories;
  const categories = (Object.keys(CATEGORY_LABELS) as ShopCategory[]).filter(
    (c) => c === category || !counts || (counts[c] ?? 0) > 0,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
      <header className="pt-8 md:pt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-heading tracking-[-0.01em] text-paper md:text-display-sm">
            {valid ? title : t("study.category")}
          </h1>
          {data && !loading ? (
            <p aria-live="polite" className="font-sans text-caption text-paper/50">
              {tn("shop.itemCount", shown.length)}
            </p>
          ) : null}
        </div>
      </header>

      {/* Category switcher: the shop's row of kinds, opened on the one the
          reader is in. */}
      <CategoryChips categories={categories} counts={counts} current={category} className="mt-5" />

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
        <ul className="mt-6 grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
          {shown.map((p) => (
            <li key={p.id} className="shop-rise">
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
          <Link href="/shop/request" className="text-premium-ink underline underline-offset-4">
            {t("shop.requestIt")}
          </Link>{" "}
          {t("shop.andWeLlLookFor")}
        </p>
      ) : null}
    </div>
  );
}
