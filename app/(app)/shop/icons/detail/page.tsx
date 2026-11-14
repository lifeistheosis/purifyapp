import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductDetailFromQuery } from "@/components/shop/ProductDetailFromQuery";
import { ShopDetailSkeleton } from "@/components/shop/ShopStates";

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
//
// The slug is read on the device (useSearchParams), so the page written into
// the bundle is its fallback until then: the piece's own outline, the one it
// shows while the piece is fetched, so the page arrives in its shape and not
// blank (cause 7 of the gate; it was null).
export default function ProductDetailQueryPage() {
  return (
    <Suspense fallback={<ShopDetailSkeleton />}>
      <ProductDetailFromQuery />
    </Suspense>
  );
}
