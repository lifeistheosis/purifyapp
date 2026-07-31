/**
 * The one canonical origin for the site. Everything that emits an absolute
 * URL (metadataBase, robots.txt, sitemap.xml, JSON-LD @id values) reads it
 * from here so the host can never drift between files again.
 *
 * No trailing slash.
 */
export const SITE = "https://purifyapp.net";
