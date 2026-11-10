import { isNativeClient } from "@/lib/platform/native";

/**
 * Where a gathering opens (1.9). On the website, its own page,
 * /florilegium/<id>. In the apps that page is not in the bundle: a reader's
 * gatherings have ids no build can know (scripts/native-build.mjs keeps
 * florilegium/[id] out), and an address the bundle has no screen for ends on
 * Today, which is where a tapped gathering went until 1.9 (found walking the
 * export as the phones serve it). So in the apps a gathering opens on a page
 * the bundle does carry, /florilegium/gathering, named in its query
 * (components/florilegium/FlorilegiumByQuery.tsx), as the shop's orders and
 * icons open on their own `detail` pages.
 *
 * A page of its own, and not the Florilegium's first page with a query, which
 * is where build 89 opened it: a change of query alone is a filter to the
 * app, not a page, so the gathering arrived with a cut while every other
 * page moved (build 89 note 4, components/nav/RouteTransition.tsx), and the
 * way back had no page to return to.
 *
 * Asked of the runtime (isNativeClient), not the build: the build's target is
 * the server's alone (lib/platform/buildTarget.ts). Every link here is drawn
 * from the reader's own gatherings, on the device, so never on a server.
 */
export function gatheringHref(id: string): string {
  return isNativeClient() ? `/florilegium/gathering?g=${encodeURIComponent(id)}` : `/florilegium/${id}`;
}

/**
 * Where a starter opens: its own page, in the apps and on the website, since
 * the four are known to every build (lib/florilegium/starters.ts).
 */
export function starterHref(id: string): string {
  return `/florilegium/begin/${id}`;
}
