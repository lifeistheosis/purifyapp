import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import {
  MEMBER_DROP_COLUMNS,
  proUntilFor,
  suggestedAddressFor,
  toMemberDrop,
} from "@/lib/eikonBox/server";
import { parseStoredAddress } from "@/lib/eikonBox/address";
import type { EikonBoxCurrent } from "@/lib/eikonBox/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY: EikonBoxCurrent = {
  eligible: false,
  drop: null,
  claim: null,
  savedAddress: null,
  suggestedAddress: null,
};

/**
 * Everything the EIKON Box screen needs, in one call: whether this member is
 * Pro, the drop they can act on, their claim if they have one, and an
 * address to prefill.
 *
 * Signed out is NOT an error: it returns the empty shape, the same way
 * /api/gifts/pending does, because this is polled on app open and a 401
 * there would be noise. Likewise, every read swallows its own failure: if
 * the migration has not been applied yet, a missing table must read as "no
 * drop", never a 500 on the layout bridge.
 *
 * ELIGIBILITY IS DECIDED HERE, on the server, from pro_until. The screen
 * renders whatever this returns and never re-derives it, because the client
 * helper fails open to "not Pro" after a 2.5s race and would tell a paying
 * member they are not a member on a slow connection.
 */
async function handleGET(req: Request) {
  if (!eikonBoxEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (await rateLimited(`eikon-current:${ipKey(req.headers)}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json(EMPTY);

  const proUntil = await proUntilFor(user.id);
  const eligible = Boolean(proUntil && new Date(proUntil).getTime() > Date.now());

  const admin = createAdminClient();

  // The drop a member can act on or is waiting on. Drafts and cancelled
  // drops are never surfaced.
  let drop: EikonBoxCurrent["drop"] = null;
  try {
    const { data } = await admin
      .from("eikon_drops")
      .select(MEMBER_DROP_COLUMNS)
      .in("status", ["open", "closed", "fulfilling", "shipped"])
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) drop = toMemberDrop(data);
  } catch {
    return NextResponse.json(EMPTY);
  }

  let claim: EikonBoxCurrent["claim"] = null;
  if (drop) {
    try {
      const { data } = await admin
        .from("eikon_drop_claims")
        .select("id, status, claimed_at, outbound_tracking, shipping_address, cancel_reason")
        .eq("drop_id", drop.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        claim = {
          id: data.id,
          status: data.status,
          claimedAt: data.claimed_at,
          tracking: data.outbound_tracking,
          shippingAddress: parseStoredAddress(data.shipping_address),
          cancelReason: data.cancel_reason,
        };
      }
    } catch {
      /* a missing claim is the common case, not an error */
    }
  }

  let savedAddress = null;
  try {
    const { data } = await admin
      .from("member_addresses")
      .select("address")
      .eq("user_id", user.id)
      .maybeSingle();
    savedAddress = parseStoredAddress(data?.address);
  } catch {
    /* ignore */
  }

  const suggestedAddress = savedAddress ? null : await suggestedAddressFor(user.id);

  const body: EikonBoxCurrent = {
    eligible,
    drop,
    claim,
    savedAddress,
    suggestedAddress,
  };
  return NextResponse.json(body);
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
