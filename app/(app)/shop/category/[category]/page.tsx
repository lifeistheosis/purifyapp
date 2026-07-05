import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/shop/ProductCard";
import { listProducts } from "@/lib/shop/catalog";
import { CATEGORY_LABELS } from "@/lib/shop/format";
import type { ShopCategory, ShopInventoryStatus } from "@/lib/shop/types";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ inventory?: string }>;
};

const INVENTORY_FILTERS: ShopInventoryStatus[] = [
  "ready_to_ship",
  "special_order",
];

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const label =
    category === "all"
      ? "All icons"
      : CATEGORY_LABELS[category as ShopCategory];
  return { title: label ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const { category } = await params;
  const { inventory } = await searchParams;

  const isAll = category === "all";
  if (!isAll && !(category in CATEGORY_LABELS)) notFound();

  const inventoryFilter = INVENTORY_FILTERS.includes(
    inventory as ShopInventoryStatus,
  )
    ? (inventory as ShopInventoryStatus)
    : undefined;

  const products = await listProducts({
    category: isAll ? undefined : (category as ShopCategory),
    inventory: inventoryFilter,
    limit: 60,
  });

  const title = isAll
    ? inventoryFilter === "ready_to_ship"
      ? "Ready to Ship"
      : "All icons"
    : CATEGORY_LABELS[category as ShopCategory];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
          Purify Shop
        </p>
        <h1 className="mt-2 font-display-serif text-heading md:text-display-sm text-paper">
          {title}
        </h1>
      </header>

      {products.length > 0 ? (
        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 font-serif text-body text-paper/60">
          Nothing here yet. If you&rsquo;re looking for a particular icon,{" "}
          <Link href="/shop/request" className="text-gold underline underline-offset-4">
            request it
          </Link>{" "}
          and we&rsquo;ll look for it.
        </p>
      )}
    </div>
  );
}
