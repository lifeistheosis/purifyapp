import { NextResponse } from "next/server";

import { TERMS_VERSION } from "@/lib/legal/version";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { legalAcceptSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Records a clickwrap acceptance of the Terms at signup. Fire-and-forget
 * from the client: acceptance recording must never block account creation,
 * so failures here return 200 with ok:false and are only logged.
 *
 * Checkout acceptances are recorded server-side in lib/shop/checkout.ts,
 * not through this route.
 */
export async function POST(req: Request) {
  if (await rateLimited(`legal-accept:${ipKey(req.headers)}`, 600, 10)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = legalAcceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Attach the session's user when one exists (OAuth signups land here
  // signed in; email signups usually don't have a session yet).
  const supabase = await createClient();
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
      return NextResponse.json({ ok: false });
    }
  } catch (e) {
    console.warn("[legal] acceptance insert failed", (e as Error).message);
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}
