// Supplier-image rights gate, shared by the public catalog (which HIDES
// gated listings) and the admin shop panel (which FLAGS them). A listing
// whose primary photo still lives on a supplier's CDN is showing the
// supplier's copyrighted image, not ours; it must not appear in the public
// storefront until a real (own or licensed) photo replaces it. Keeping the
// predicate in one place means the admin's "hidden" flag can never drift
// from what the storefront actually filters. Extend the host list if a new
// supplier CDN is used.

export const SUPPLIER_IMAGE_HOSTS = ["kwcdn.com"];

type MediaLike = {
  media_url: string;
  sort_order?: number | null;
  is_primary?: boolean | null;
};

/** The image the storefront would show first: primary flag wins, then sort
 * order. Mirrors orderMedia in lib/shop/catalog.ts without mutating. */
export function primaryMediaUrl(media: MediaLike[]): string | null {
  if (media.length === 0) return null;
  const sorted = [...media].sort((a, b) =>
    Boolean(a.is_primary) !== Boolean(b.is_primary)
      ? Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary))
      : (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return sorted[0]?.media_url ?? null;
}

export function isSupplierImageUrl(url: string | null | undefined): boolean {
  return Boolean(url && SUPPLIER_IMAGE_HOSTS.some((h) => url.includes(h)));
}

/** True when the storefront's rights gate would hide this listing. */
export function hasSupplierImage(media: MediaLike[]): boolean {
  return isSupplierImageUrl(primaryMediaUrl(media));
}
