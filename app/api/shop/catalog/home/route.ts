import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { listLiveStores, listProducts } from "@/lib/shop/catalog";
import { shopEnabled } from "@/lib/shop/flags";

/**
 * Marketplace home data in one call. Public + RLS-scoped (published products,
 * live stores only), so no auth. Bundled into a single endpoint to keep the
 * native shell to one cross-origin round-trip on the shop's landing surface.
 *
 * `stores` replaced a getStore("eikon") call. A marketplace whose home page
 * names one store by literal is a shop with one store: a second store could be
 * created, provisioned, stocked and made live, and nothing anywhere would link
 * to it. `eikon` is kept in the payload for one release so a native shell
 * running the previous bundle does not lose its store card mid-upgrade; it is
 * simply the first live store, which is EIKON today by age.
 */
export async function GET(req: Request) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }

  const [featured, readyToShip, recent, stores] = await Promise.all([
    listProducts({ limit: 8 }),
    listProducts({ inventory: "ready_to_ship", limit: 8 }),
    listProducts({ limit: 12 }),
    listLiveStores(),
  ]);

  return withCors(
    NextResponse.json(
      { featured, readyToShip, recent, stores, eikon: stores[0] ?? null },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
