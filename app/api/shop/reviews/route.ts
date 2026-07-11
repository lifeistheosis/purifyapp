import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { rateLimited } from "@/lib/security/ratelimit";
import { shopEnabled } from "@/lib/shop/flags";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Submit (or update) a review. Verified buyers only: the write runs through the
 * shop_submit_review RPC with the caller's own token, so the RPC's proof-of-
 * purchase check runs as that user. A non-buyer's request is rejected by the
 * RPC and surfaced here honestly.
 */
const schema = z.object({
  productId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  body: z.string().trim().max(4000).nullish(),
});

async function handlePOST(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to review." }, { status: 401 });
  }
  if (await rateLimited(`shop-review:${user.id}`, 3600, 30)) {
    return NextResponse.json(
      { error: "Too many reviews. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid review." },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc("shop_submit_review", {
    p_product_id: parsed.data.productId,
    p_stars: parsed.data.stars,
    p_body: parsed.data.body ?? null,
  });
  if (error) {
    // The RPC raises a human-readable message for the not-a-buyer case.
    return NextResponse.json(
      { error: error.message || "Couldn't save your review." },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
