import { SAINTS } from "./saints";

/**
 * Whether an address under /saints names a saint or a work the library does
 * not have (1.9), for the proxy, which answers it with a true 404.
 *
 * A saint's page, a work's page and a saint's web are rendered on request on
 * the website, and each streams its outline (loading.tsx) before it knows
 * whether there is anything to show. The status is fixed when the stream
 * starts, so a page's own notFound() came inside a 200: /saints/zzz-not-a-saint
 * answered 200, "Saint | Purify", a page to a search engine. Next's own advice
 * for a 404 under streaming is this one: check the slug in the proxy, fast,
 * with nothing fetched (node_modules/next/dist/docs, loading.md, "Status
 * codes").
 *
 * Read from the library itself, so a saint or a work added to it is never
 * answered 404. It says true only for a saint or a work that is not there:
 * the index, a saint's web, an address with a dot in it (a file in public/,
 * which the proxy runs before) and anything with more parts are left to the
 * routes. A missing icon file has its own route (app/(app)/saints/icons).
 */
let WORKS: Map<string, Set<string>> | null = null;

export function unknownSaintAddress(pathname: string): boolean {
  if (!pathname.startsWith("/saints/")) return false;
  const parts = pathname.slice("/saints/".length).replace(/\/$/, "").split("/");
  if (!parts[0] || parts.length > 2 || parts.some((p) => p.includes("."))) return false;
  const [slug, work] = parts;
  if (slug === "icons") return false;
  WORKS ??= new Map(SAINTS.map((s) => [s.slug, new Set(s.works.map((w) => w.slug))]));
  const works = WORKS.get(slug);
  if (!works) return true;
  if (work === undefined || work === "web") return false;
  return !works.has(work);
}
