"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { onRouteCommitted } from "@/lib/ui/scrollReset";
import { ProductDetailClient } from "./ProductDetailClient";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * The product page, reached by `?slug=` instead of by a path segment.
 *
 * WHY THIS EXISTS. `app/(app)/shop/icons/[slug]` enumerates its routes with
 * `listPublishedProductSlugs()` at build time, and under `output: "export"`
 * that list is the only source of routes in `out/`. A product published in
 * admin after the AAB or IPA was built therefore has no shell in the bundle,
 * and the failure is not a 404 the reader can understand: the Capacitor asset
 * server falls back to the root `index.html` for any extensionless path it has
 * no file for, so tapping a new product silently lands the reader on Today.
 * The card's own Add to cart still worked, because the catalogue itself comes
 * from the live API, which is what made it look like the product existed but
 * its page did not.
 *
 * This route's path is FIXED, so its shell is always in the bundle and the
 * slug rides in the query, where the asset lookup never sees it. The body is
 * the same ProductDetailClient the path route renders, and it already fetches
 * everything live, so nothing about the page differs but how it was reached.
 *
 * Same shape and same reason as app/(app)/shop/orders/detail and
 * shop/messages/detail, which are query routes because per-user ids cannot be
 * enumerated at build either.
 *
 * The website keeps the real URLs. Only the native shells link here, so
 * /shop/icons/<slug> stays canonical and keeps its generateMetadata.
 */
export function ProductDetailFromQuery() {
  // A missing or unknown slug needs no special case here: the catalogue fetch
  // 404s and ProductDetailClient already renders its translated "Icon not
  // found" state with a link back to the shop, which is the same thing the
  // path route shows for a slug that no longer exists.
  const slug = useSearchParams().get("slug") ?? "";

  // From one piece to another (a "you may also like" rail at the foot of the
  // page) the path does not change, only the query, so the app-wide reset
  // (components/nav/ScrollResetBridge.tsx, keyed on the path) never hears it
  // and the next piece opened at the foot of its own page. Not on the first
  // render: arriving here by a path change is the bridge's, and coming back
  // to a piece is the browser's.
  const first = useRef(true);
  useIsoLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onRouteCommitted();
  }, [slug]);

  return <ProductDetailClient slug={slug} />;
}
