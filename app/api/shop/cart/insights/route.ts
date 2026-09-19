import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { activeDealsForCart, recentCarts, type ActiveDeal } from "@/lib/shop/cartDealServer";
import { demandBySlug } from "@/lib/shop/cartDemand";
import { shopEnabled } from "@/lib/shop/flags";
import { readShopSettings } from "@/lib/shop/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Two live numbers for the shopper, in one call:
 *
 *   demand  how many OTHER shoppers hold each asked-about product in a cart
 *           touched this week (lib/shop/cartDemand.ts: counted, never padded,
 *           the viewer never in their own count)
 *   deals   the cart deals live right now on the caller's own cart
 *           (lib/shop/cartDealServer.ts), keyed by slug
 *
 * GET ?slugs=a,b&token=<cart token>. The token is the device's cart token from
 * lib/shop/cartSync.ts, the same unguessable id the sync route keys the row
 * on, so knowing it is what makes a cart yours. Without it, deals is empty.
 *
 * Per viewer, so never cached by a shared cache. Reachable from the native
 * shell (Bearer), which is why it answers OPTIONS.
 */

const SLUG = /^[a-z0-9-]{1,120}$/;
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  if (await rateLimited(`cart-insights:${ipKey(req.headers)}`, 60, 120)) {
    return withCors(NextResponse.json({ error: "Slow down." }, { status: 429 }), req);
  }

  const url = new URL(req.url);
  const slugs = [
    ...new Set(
      (url.searchParams.get("slugs") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => SLUG.test(s)),
    ),
  ].slice(0, 30);
  const rawToken = url.searchParams.get("token");
  const token = rawToken && TOKEN.test(rawToken) ? rawToken : null;

  let viewerUserId: string | null = null;
  try {
    const supabase = await createClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerUserId = user?.id ?? null;
  } catch {
    /* anonymous is fine: the viewer is then excluded by token only */
  }

  const now = Date.now();
  const admin = createAdminClient();
  const { settings } = await readShopSettings();

  let demand: Record<string, number> = {};
  if (settings.showCartDemand && slugs.length > 0) {
    demand = demandBySlug(await recentCarts(admin, now), {
      slugs,
      viewerToken: token,
      viewerUserId,
      now,
    });
  }

  let deals: Record<string, ActiveDeal> = {};
  if (token) {
    deals = await activeDealsForCart(admin, { cartToken: token, cfg: settings.cartDeal, now });
  }

  return withCors(
    NextResponse.json({ demand, deals, now }, { headers: { "Cache-Control": "private, no-store" } }),
    req,
  );
}

export const OPTIONS = corsPreflight;
