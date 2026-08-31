/**
 * Where a product link should point, given which shell the reader is in.
 *
 * THE PROBLEM. `app/(app)/shop/icons/[slug]` enumerates its routes with
 * `listPublishedProductSlugs()` at build time, and under `output: "export"`
 * that list is the only source of routes in `out/`. A product published in
 * admin after the AAB or IPA was built has no shell in the bundle, and the
 * Capacitor asset server answers any extensionless path it has no file for
 * with the root `index.html`. So tapping a new product in the app did not
 * 404, it silently landed the reader on Today, while the card's Add to cart
 * kept working because the catalogue itself comes from the live API.
 *
 * THE ANSWER. In the native shells, link to the fixed `shop/icons/detail`
 * route and carry the slug in the query, where the asset lookup never sees
 * it. On the website nothing changes: `/shop/icons/<slug>` stays canonical,
 * indexable and server-rendered on demand, which is why the site never had
 * this bug.
 *
 * `native` is passed in rather than read here, so a component can take it from
 * `useIsNative()` (which agrees with SSR on the first paint and switches after
 * hydration) and a plain module like lib/bookmarks.ts can use `isNativeClient()`
 * at call time. Reading it inside would force one of those two to be wrong.
 */
export function productHref(
  slug: string,
  native: boolean,
  hash = "",
): string {
  if (!native) return `/shop/icons/${slug}${hash}`;
  return `/shop/icons/detail?slug=${encodeURIComponent(slug)}${hash}`;
}
