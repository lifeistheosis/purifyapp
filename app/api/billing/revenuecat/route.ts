import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RevenueCat → Purify entitlement webhook.
 *
 * RevenueCat is the source of truth for purchase state across stores
 * (Google Play now, the App Store when iOS unparks). On every subscription
 * lifecycle event it POSTs here; we translate the event into the one fact
 * Purify cares about — `plus_until` — and write it to public.entitlements
 * via the service-role `upsert_entitlement` RPC. The derive logic
 * (lib/entitlements) compares `plus_until` to now, so a single timestamp
 * cleanly expresses purchase, renewal, cancel-but-still-active, and expiry.
 *
 * Identity: the app sets RevenueCat's appUserID to the Supabase user id at
 * sign-in (see lib/billing/revenuecat). So `event.app_user_id` IS the
 * Supabase uid. Anonymous ids ($RCAnonymousID:…) are pre-login and have no
 * account to grant — we skip them.
 *
 * Auth: RevenueCat sends the exact `Authorization` header value configured
 * in its dashboard; we compare it to REVENUECAT_WEBHOOK_SECRET. If the env
 * var is unset we refuse (fail closed) rather than accept unsigned writes.
 *
 * Always answer 2xx for events we understood (even no-ops), so RevenueCat
 * does not retry indefinitely; answer 4xx only for auth/parse failures.
 */

// RevenueCat store → our plus_source vocabulary (entitlements.plus_source).
function sourceForStore(store: string | undefined): string {
  switch (store) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "apple";
    case "STRIPE":
      return "stripe";
    case "PLAY_STORE":
    case "AMAZON":
    case "PROMOTIONAL":
    default:
      return "google";
  }
}

type RcEvent = {
  type?: string;
  app_user_id?: string;
  store?: string;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
};

export async function POST(req: NextRequest) {
  // Trim both sides: a shared secret never meaningfully carries leading or
  // trailing whitespace, and a stray space pasted into the Render env or the
  // RevenueCat dashboard is the classic cause of a silent 403.
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Fail closed: never accept entitlement writes without a configured
    // shared secret.
    console.error("[revenuecat] REVENUECAT_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const provided = req.headers.get("authorization")?.trim() ?? "";
  if (provided !== secret) {
    // Log LENGTHS only, never the values. Unequal lengths point to hidden
    // whitespace or a "Bearer " prefix on one side; equal lengths that still
    // mismatch mean the two secrets are genuinely different strings.
    console.warn(
      `[revenuecat] webhook auth mismatch (provided len ${provided.length}, expected len ${secret.length})`,
    );
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let event: RcEvent;
  try {
    const body = (await req.json()) as { event?: RcEvent };
    event = body.event ?? {};
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const type = event.type ?? "";

  // RevenueCat's dashboard "Send test event" button posts a TEST event with
  // no real user — acknowledge it so the dashboard shows green.
  if (type === "TEST") {
    return NextResponse.json({ ok: true, test: true });
  }

  const appUserId = event.app_user_id ?? "";
  // Skip anonymous (pre-login) ids and anything that is not a UUID — those
  // do not map to a Supabase account.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      appUserId,
    );
  if (!isUuid) {
    return NextResponse.json({ ok: true, skipped: "non-account user" });
  }

  // Events without a subscription period (e.g. TRANSFER, SUBSCRIBER_ALIAS)
  // carry no expiry to act on — acknowledge without writing.
  if (typeof event.expiration_at_ms !== "number") {
    return NextResponse.json({ ok: true, skipped: `no expiry on ${type}` });
  }

  // The single fact we persist. For CANCELLATION the access window still
  // runs to expiration_at_ms (the user keeps Plus until the period ends);
  // for EXPIRATION that timestamp is already in the past, so derive() makes
  // the account free automatically. One timestamp, every case.
  const plusUntil = new Date(event.expiration_at_ms).toISOString();
  const source = sourceForStore(event.store);

  const admin = createAdminClient();

  // upsert_entitlement overwrites is_supporter, so preserve the pre-launch
  // supporter promise by reading the current value first (default false).
  const { data: existing } = await admin
    .from("entitlements")
    .select("is_supporter")
    .eq("user_id", appUserId)
    .maybeSingle();
  const isSupporter = existing?.is_supporter === true;

  const { error } = await admin.rpc("upsert_entitlement", {
    p_user_id: appUserId,
    p_is_supporter: isSupporter,
    p_plus_until: plusUntil,
    p_plus_source: source,
  });

  if (error) {
    console.error("[revenuecat] upsert_entitlement failed", error.message);
    // 500 → RevenueCat retries with backoff, which is what we want on a
    // transient DB error.
    return NextResponse.json({ error: "Write failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: appUserId, plus_until: plusUntil });
}
