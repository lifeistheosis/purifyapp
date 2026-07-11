"use client";

import { useIsNative } from "@/lib/platform/native";
import { SoftTile, type Tone } from "@/components/mobile/SoftTiles";
import { Lampada } from "@/components/ui/icons/Lampada";

/**
 * The Discover tile for the EIKON shop, platform-aware:
 *
 *  - Mobile web: an ordinary in-app link to /shop.
 *  - Native shell: the /shop tree is web-only (stashed out of the static
 *    export, and Play policy keeps physical goods off Play Billing anyway),
 *    so the tile hands the storefront to the system browser instead.
 */
export function ShopTile({ tone = "a" }: { tone?: Tone }) {
  const isNative = useIsNative();
  return (
    <SoftTile
      href={isNative ? "https://purifyapp.net/shop" : "/shop"}
      external={isNative}
      label="Shop"
      sub="Icons & prayer goods from EIKON"
      icon={<Lampada size={21} />}
      tone={tone}
    />
  );
}
