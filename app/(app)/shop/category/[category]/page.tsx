import type { Metadata } from "next";

import { CategoryClient } from "@/components/shop/CategoryClient";
import { CATEGORY_LABELS } from "@/lib/shop/format";
import type { ShopCategory } from "@/lib/shop/types";

type Params = { params: Promise<{ category: string }> };

// The category set is a fixed enum plus the "all" pseudo-category, so the whole
// route enumerates at build for output:export.
export function generateStaticParams() {
  return [
    { category: "all" },
    ...Object.keys(CATEGORY_LABELS).map((category) => ({ category })),
  ];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const label =
    category === "all" ? "All icons" : CATEGORY_LABELS[category as ShopCategory];
  return { title: label ?? "Category" };
}

// Server shell; the grid renders client-side. CategoryClient reads any ?q= /
// ?inventory= deep-link params from window.location in a mount effect (NOT
// useSearchParams), so it needs no Suspense boundary — and must not have one:
// a Suspense-wrapped client child on this statically-exported route failed to
// hydrate, leaving the products fetch unfired and the page stuck on its
// skeleton (live-broken on prod /shop/category/*, fixed here).
export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  return <CategoryClient category={category} />;
}
