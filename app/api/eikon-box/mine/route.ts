import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { parseStoredAddress } from "@/lib/eikonBox/address";
import type { MemberClaimHistoryRow } from "@/lib/eikonBox/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The member's own box history, newest first.
 *
 * Joined server-side rather than read through RLS from the client, because
 * eikon_drops deliberately has NO select policy: the join is how a member
 * learns their box's title and month without the sourcing notes coming with
 * it.
 */
async function handleGET(req: Request) {
  if (!eikonBoxEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (await rateLimited(`eikon-mine:${ipKey(req.headers)}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ claims: [] });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("eikon_drop_claims")
      .select(
        "id, status, claimed_at, outbound_tracking, shipping_address, cancel_reason, drop_id, drop:eikon_drops(title, period_month, image_url, status)",
      )
      .eq("user_id", user.id)
      .order("claimed_at", { ascending: false })
      .limit(24);

    if (error) return NextResponse.json({ claims: [] });

    const claims: MemberClaimHistoryRow[] = (data ?? []).map((row) => {
      const drop = (Array.isArray(row.drop) ? row.drop[0] : row.drop) as
        | { title: string; period_month: string; image_url: string | null; status: MemberClaimHistoryRow["dropStatus"] }
        | null;
      return {
        id: row.id,
        status: row.status,
        claimedAt: row.claimed_at,
        tracking: row.outbound_tracking,
        shippingAddress: parseStoredAddress(row.shipping_address),
        cancelReason: row.cancel_reason,
        dropId: row.drop_id,
        dropTitle: drop?.title ?? "EIKON Box",
        periodMonth: drop?.period_month ?? "",
        imageUrl: drop?.image_url ?? null,
        dropStatus: drop?.status ?? "shipped",
      };
    });

    return NextResponse.json({ claims });
  } catch {
    return NextResponse.json({ claims: [] });
  }
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
