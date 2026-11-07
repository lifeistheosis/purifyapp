import { isNativeClient } from "@/lib/platform/native";

/**
 * Where a gathering opens (1.9). On the website, its own page,
 * /florilegium/<id>. In the apps that page is not in the bundle: a reader's
 * gatherings have ids no build can know (scripts/native-build.mjs keeps
 * florilegium/[id] out), and an address the bundle has no screen for ends on
 * Today, which is where a tapped gathering went until 1.9 (found walking the
 * export as the phones serve it). So in the apps a gathering opens on the
 * Florilegium's own page, which the bundle carries, named in its query
 * (components/florilegium/FlorilegiumByQuery.tsx).
 *
 * Asked of the runtime (isNativeClient), not the build: the build's target is
 * the server's alone (lib/platform/buildTarget.ts). Every link here is drawn
 * from the reader's own gatherings, on the device, so never on a server.
 */
export function gatheringHref(id: string): string {
  return isNativeClient() ? `/florilegium?g=${encodeURIComponent(id)}` : `/florilegium/${id}`;
}
