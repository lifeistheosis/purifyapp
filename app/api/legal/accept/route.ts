import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { TERMS_VERSION } from "@/lib/legal/version";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { legalAcceptSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Records a clickwrap acceptance of the Terms at signup.
 *
 * This is NO LONGER fire-and-forget. The old contract ("acceptance recording
 * must never block account creation") sounded protective and produced the
 * opposite: combined with a relative fetch that the native shell cannot
 * reach, an unawaited call and an empty catch, every account created in the
 * Android app has no row in terms_acceptances and nothing reported it. The
 * caller now aborts sign-up when this does not confirm; see
 * lib/legal/recordAcceptance.ts for why that ordering is the safe one.
 *
 * The response still distinguishes a write failure (200 with ok:false) from a
 * bad request, so the caller must check the body, not just the status.
 *
 * withCors + OPTIONS because the native shell reaches this cross-origin, and
 * createClientFromRequest because the cookie-only client cannot see a Bearer
 * caller. Without both, a native sign-up could never record anything.
 *
 * Checkout acceptances are recorded server-side in lib/shop/checkout.ts, and
 * are a separate record from this one. Neither should be described as a
 * general GDPR consent record.
 */
export async function POST(req: Request) {
  if (await rateLimited(`legal-accept:${ipKey(req.headers)}`, 600, 10)) {
    return withCors(NextResponse.json({ ok: false }, { status: 429 }), req);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json({ ok: false }, { status: 400 }), req);
  }
  const parsed = legalAcceptSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(NextResponse.json({ ok: false }, { status: 400 }), req);
  }

  // Attach the session's user when one exists (OAuth signups land here
  // signed in; email signups usually don't have a session yet).
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("terms_acceptances").insert({
      user_id: user?.id ?? null,
      email: user?.email ?? parsed.data.email ?? null,
      context: parsed.data.context,
      terms_version: TERMS_VERSION,
    });
    if (error) {
      console.warn("[legal] acceptance insert failed", error.message);
      return withCors(NextResponse.json({ ok: false }), req);
    }
  } catch (e) {
    console.warn("[legal] acceptance insert failed", (e as Error).message);
    return withCors(NextResponse.json({ ok: false }), req);
  }
  return withCors(NextResponse.json({ ok: true }), req);
}

export const OPTIONS = corsPreflight;
