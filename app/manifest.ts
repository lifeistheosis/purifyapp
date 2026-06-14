import type { MetadataRoute } from "next";

/**
 * App-shell Web App Manifest. Promoted from the older static
 * `manifest.webmanifest` so we get TypeScript validation and can wire
 * shortcuts + maskable icon variants.
 *
 *  - `display: "standalone"` so the installed app drops the browser UI.
 *  - `background_color` matches `--color-night` so the splash matches
 *    the dark sacred surface rather than flashing white.
 *  - Three shortcuts (Today / Bible / Prayers) so a long-press on the
 *    home-screen icon jumps straight to the right surface.
 *  - Both PNG icons are declared with `purpose: "any maskable"` ,
 *    Android Adaptive Icons crop the 512px square to a circle, so the
 *    same file is used and the safe-area is presumed adequate. If the
 *    crop ever looks tight we'll add a padded variant.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Purify, Orthodox prayer, calendar, and Scripture",
    short_name: "Purify",
    description:
      "Daily prayer, the saint of the day, fasting status, and the Septuagint plus KJV with patristic commentary.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#101013",
    theme_color: "#101013",
    categories: ["lifestyle", "books", "education"],
    icons: [
      // "any" entries cover the install-screen / address-bar uses; the
      // "maskable" entries reuse the same files for Android Adaptive
      // Icons (which crop). If the crop ever looks tight we'll add a
      // padded variant; for now the existing icons have enough margin.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Today",
        short_name: "Today",
        description: "Today's prayer, saint, and fast.",
        url: "/prayers/today",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Bible",
        short_name: "Bible",
        description: "The Septuagint and the King James with the Fathers.",
        url: "/bible",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Discover",
        short_name: "Discover",
        description: "Saints, councils, calendar, fasts.",
        url: "/discover",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
