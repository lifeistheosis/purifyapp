"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ProductCard } from "@/components/shop/ProductCard";
import { ShopError, ShopGridSkeleton } from "@/components/shop/ShopStates";
import { fetchShopProducts } from "@/lib/shop/catalogClient";
import { CATEGORY_LABELS } from "@/lib/shop/format";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import type { ShopCategory, ShopInventoryStatus } from "@/lib/shop/types";

const INVENTORY_FILTERS: ShopInventoryStatus[] = [
  "ready_to_ship",
  "special_order",
];

export function CategoryClient({ category }: { category: string }) {
  const searchParams = useSearchParams();
  const inventoryParam = searchParams.get("inventory");
  const isAll = category === "all";
  const inventoryFilter = INVENTORY_FILTERS.includes(
    inventoryParam as ShopInventoryStatus,
  )
    ? (inventoryParam as ShopInventoryStatus)
    : undefined;

  const valid = isAll || category in CATEGORY_LABELS;

  const { data, error, loading, reload } = useAsyncData(
    () =>
      valid
        ? fetchShopProducts({
            category: isAll ? undefined : (category as ShopCategory),
            inventory: inventoryFilter,
            limit: 60,
          })
        : Promise.resolve([]),
    [category, inventoryFilter],
  );

  const title = isAll
    ? inventoryFilter === "ready_to_ship"
      ? "Ready to Ship"
      : "All icons"
    : CATEGORY_LABELS[category as ShopCategory];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          Purify Shop
        </p>
        <h1 className="mt-2 font-display-serif text-heading md:text-display-sm text-paper">
          {valid ? title : "Category"}
        </h1>
      </header>

      {loading ? <ShopGridSkeleton /> : null}
      {error ? <ShopError message={error} onRetry={reload} /> : null}

      {data && data.length > 0 ? (
        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {data.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      ) : null}

      {data && data.length === 0 && !loading ? (
        <p className="mt-8 font-serif text-body text-paper/60">
          Nothing here yet. If you&rsquo;re looking for a particular icon,{" "}
          <Link href="/shop/request" className="text-gold underline underline-offset-4">
            request it
          </Link>{" "}
          and we&rsquo;ll look for it.
        </p>
      ) : null}
    </div>
  );
}
