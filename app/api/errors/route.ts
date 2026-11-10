import { NextResponse } from "next/server";
import { z } from "zod";

import { isAutomatedAgent } from "@/lib/analytics/bot";
import { corsPreflight, corsRoute, isAllowedNativeOrigin } from "@/lib/api/cors";
import { ERROR_PLATFORMS } from "@/lib/errors/scrub";
import { recordError } from "@/lib/errors/store";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where the apps and the website's pages report something that failed on a
 * reader's screen, or a call that came back failed (admin item A10; the list
 * is in the admin's Services page, the table is
 * supabase/migrations/20261110002922_app_errors.sql).
 *
 * Anonymous by design, as the privacy line Edgar approved says: "the page, the
 * app version and the kind of device, never who you are". The body is checked
 * here and cut down again by lib/errors/scrub.ts before it is kept; this route
 * never reads a cookie or a token, and keeps no address.
 *
 * It answers 204 to anything well formed, kept or not (the table may not be
 * there yet, or the server's minute may be full), so a client never retries
 * and never learns anything from the answer. Held to 30 reports a minute and
 * 300 a day from one address. Native shells post cross-origin, so it answers
 * the preflight (lib/api/cors.ts), as /api/track does.
 */

const bodySchema = z
  .object({
    source: z.enum(["screen", "request"]),
    page: z.string().max(2000),
    message: z.string().max(2000).optional(),
    status: z.number().int().min(100).max(599).optional(),
    appVersion: z.string().max(32).optional(),
    platform: z.enum(ERROR_PLATFORMS),
  })
  .strict();

async function handlePOST(req: Request) {
  const noStore = { "Cache-Control": "no-store" };
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs && sfs !== "same-origin" && sfs !== "same-site" && sfs !== "none" && !isAllowedNativeOrigin(req.headers.get("origin"))) {
    return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  }
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415, headers: noStore });
  }
  // A crawler's failures are not a reader's.
  if (isAutomatedAgent(req.headers.get("user-agent"), req.headers.get("sec-ch-ua"))) {
    return new NextResponse(null, { status: 204, headers: noStore });
  }
  const ip = ipKey(req.headers);
  if ((await rateLimited(`errors:${ip}`, 60, 30)) || (await rateLimited(`errors-day:${ip}`, 86_400, 300))) {
    return new NextResponse(null, { status: 429, headers: noStore });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400, headers: noStore });

  const b = parsed.data;
  // The admin's own pages are not readers' errors.
  if (!b.page.startsWith("/admin")) {
    await recordError({
      source: b.source,
      page: b.page,
      message: b.message,
      status: b.status,
      appVersion: b.appVersion,
      platform: b.platform,
    });
  }
  return new NextResponse(null, { status: 204, headers: noStore });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
