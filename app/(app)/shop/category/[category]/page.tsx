import type { Metadata } from "next";
import { Suspense } from "react";

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

// Server shell; the grid renders client-side (it reads the ?inventory filter
// from the URL) so it works in the native local-first export.
export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  return (
    <Suspense fallback={null}>
      <CategoryClient category={category} />
    </Suspense>
  );
}
