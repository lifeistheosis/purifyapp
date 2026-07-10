import { NextResponse } from "next/server";

import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { shopIconRequestSchema } from "@/lib/security/schemas";
import { getSaint } from "@/lib/saints/saints";
import { shopEnabled } from "@/lib/shop/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Request an Icon intake. Anonymous submissions are welcome (demand
 * collection is the point), which is why the insert runs with the
 * service role behind zod validation and a rate limit instead of a
 * client-side RLS insert. Status is always 'new' — a client can never
 * set workflow columns.
 */
export async function POST(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }
  if (await rateLimited(`shop-request:${ipKey(req.headers)}`, 3600, 10)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopIconRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !data.email) {
    return NextResponse.json(
      { error: "Add an email address so we can write back, or sign in." },
      { status: 400 },
    );
  }

  // Soft-validate the saint link: an unknown slug becomes a plain-text
  // subject rather than an error — the request is still useful.
  const saintSlug =
    data.saintSlug && getSaint(data.saintSlug) ? data.saintSlug : null;

  const admin = createAdminClient();
  const { error } = await admin.from("shop_icon_requests").insert({
    user_id: user?.id ?? null,
    email: data.email ?? user?.email ?? null,
    subject: data.subject,
    saint_slug: saintSlug,
    request_type: data.requestType,
    preferred_size: data.preferredSize ?? null,
    product_preference: data.productPreference ?? null,
    budget_band: data.budgetBand ?? null,
    desired_date: data.desiredDate ?? null,
    notes: data.notes ?? null,
    notify_when_available: Boolean(data.notify),
  });
  if (error) {
    console.warn("[shop] request insert failed", error.message);
    return NextResponse.json(
      { error: "Couldn't save your request. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
