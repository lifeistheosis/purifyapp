import { NextResponse } from "next/server";

import { corsPreflight, corsRoute, isAllowedNativeOrigin } from "@/lib/api/cors";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { trackEventSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Aggregate product events, beside /api/track and deliberately narrower.
 *
 * /api/track records a session id with every pageview so the Live View can
 * count who is on the site. This route records NO session id and no reader:
 * a row is a name, a small closed props object, and a time. The event names
 * and their props are a closed list in lib/security/schemas.ts, so an
 * identifier cannot arrive as a prop. Every event lands in analytics_events,
 * disclosed on /privacy beside the two analytics tables.
 *
 * Same hardening as /api/track: JSON only, Sec-Fetch-Site sanity with the
 * native shells exempted, a per-IP budget, writes with the service role,
 * failures swallowed so tracking never breaks a page. A missing table drops
 * the write and answers ok.
 */
async function handlePOST(req: Request) {
  const sfs = req.headers.get("sec-fetch-site");
  const fromNativeShell = isAllowedNativeOrigin(req.headers.get("origin"));
  if (sfs && sfs !== "same-origin" && sfs !== "same-site" && sfs !== "none" && !fromNativeShell) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
  }

  const ip = ipKey(req.headers);
  if (await rateLimited(`track-event:${ip}`, 60, 60)) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = trackEventSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    const { name, props } = parsed.data;

    const { error } = await createAdminClient()
      .from("analytics_events")
      .insert({ name, props: props ?? {} });
    if (error && !isTableAbsent(error)) {
      console.error("[track/event] insert failed", error.message);
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[track/event] unhandled", (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
