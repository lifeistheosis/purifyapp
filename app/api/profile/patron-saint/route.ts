import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { getSaint } from "@/lib/saints/saints";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A reader's patron saint (profiles.patron_saint), for the name-day email.
 *
 * The slug must be a registry saint with a feast day, checked here, so the
 * column can only ever hold something the daily job can find a feast for.
 * Null clears it. Service-role write, as profiles lets a reader read their own
 * row and nothing more.
 */

const Body = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,100}$/).nullable() });

async function signedIn(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function handleGET(req: Request) {
  const user = await signedIn(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("patron_saint")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Not available yet." }, { status: 503 });
  return NextResponse.json({ slug: (data as { patron_saint: string | null } | null)?.patron_saint ?? null });
}

async function handlePUT(req: Request) {
  const user = await signedIn(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`patron:${user.id ?? ipKey(req.headers)}`, 60, 20)) {
    return NextResponse.json({ error: "Too many changes." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown saint." }, { status: 400 });

  const slug = parsed.data.slug;
  if (slug) {
    const saint = getSaint(slug);
    if (!saint || !saint.feastDays?.length) return NextResponse.json({ error: "Unknown saint." }, { status: 400 });
  }

  const { error } = await createAdminClient().from("profiles").update({ patron_saint: slug }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Not available yet." }, { status: 503 });
  return NextResponse.json({ slug });
}

export const GET = corsRoute(handleGET);
export const PUT = corsRoute(handlePUT);
export const OPTIONS = corsPreflight;
