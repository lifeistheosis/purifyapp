import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { getStore, listProducts } from "@/lib/shop/catalog";
import { shopEnabled } from "@/lib/shop/flags";

/**
 * Marketplace home data in one call. Public + RLS-scoped (published products,
 * live stores only), so no auth. Bundled into a single endpoint to keep the
 * native shell to one cross-origin round-trip on the shop's landing surface.
 */
export async function GET(req: Request) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }

  const [featured, readyToShip, recent, eikon] = await Promise.all([
    listProducts({ limit: 8 }),
    listProducts({ inventory: "ready_to_ship", limit: 8 }),
    listProducts({ limit: 12 }),
    getStore("eikon"),
  ]);

  return withCors(
    NextResponse.json(
      { featured, readyToShip, recent, eikon },
      { headers: { "Cache-Control": "public, max-age=120" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
