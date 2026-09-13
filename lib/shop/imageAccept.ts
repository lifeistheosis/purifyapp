/**
 * Which image types a product or store upload accepts.
 *
 * ── Why this is its own file ───────────────────────────────────────────
 *
 * These two constants used to live in lib/shop/imageNormalise.ts, whose first
 * line is `import sharp from "sharp"`. Three client components imported the
 * `accept` attribute from there: ProductMediaManager in the admin, and the
 * seller ListingForm and StoreForm. Importing one string from that module
 * pulls the whole module into the browser bundle, sharp with it, and sharp
 * requires child_process and fs. Turbopack answers "Module not found" and the
 * page does not compile. Because ProductMediaManager sits under ShopHubTab,
 * that took down the entire admin shell, not only the Shop tab.
 *
 * Found 2026-09-13 while verifying admin changes on /admin/shell-preview. It
 * arrived with the photo normalisation work on 2026-09-05 and was never on
 * main, so production was not affected.
 *
 * This file imports nothing, so anything may import it. imageNormalise.ts
 * re-exports both constants, so the media routes and scripts/shop-import.mjs
 * that already read them from there are unchanged.
 */

/**
 * Accepted upload MIME types. HEIC and HEIF are accepted at the door and
 * decoded by sharp where the bundled libvips can; where it cannot, the
 * decode error surfaces as ImageDecodeError and the route answers 415 with
 * a plain sentence. See docs/SHOP.md.
 */
export const IMAGE_ACCEPTED_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];

/** The `accept` attribute for a file input that feeds either media route. */
export const IMAGE_ACCEPT_ATTR = IMAGE_ACCEPTED_TYPES.join(",");
