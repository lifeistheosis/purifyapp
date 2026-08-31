import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductDetailFromQuery } from "@/components/shop/ProductDetailFromQuery";

export const metadata: Metadata = {
  title: "Icon | EIKON",
  // The website keeps /shop/icons/<slug> as the canonical, indexable URL with
  // its per-product title and description. This route exists for the native
  // shells and must not compete with it in search.
  robots: { index: false, follow: false },
};

// Query-param route (?slug=): the sibling [slug] segment enumerates its routes
// at BUILD time, so a product published in admin afterwards has no shell in the
// static export and the Capacitor asset server falls back to the root
// index.html, landing the reader on Today. This path is fixed, so its shell is
// always bundled and the slug rides in the query where the asset lookup never
// sees it. Same shape and same reason as shop/orders/detail.
export default function ProductDetailQueryPage() {
  return (
    <Suspense fallback={null}>
      <ProductDetailFromQuery />
    </Suspense>
  );
}
