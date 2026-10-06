import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { geolocate, clientIp } from "@/lib/analytics/geo";
import { isAutomatedAgent } from "@/lib/analytics/bot";
import { sessionStart } from "@/lib/analytics/sessionStart";
import { trackSchema } from "@/lib/security/schemas";
import { rateLimited, ipKey } from "@/lib/security/ratelimit";
import { corsPreflight, corsRoute, isAllowedNativeOrigin } from "@/lib/api/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Parse the primary language tag from an Accept-Language header.
 * "es-MX,es;q=0.9,en;q=0.8" → "es". Returns null when the header is
 * absent or malformed. Truncated to 8 chars defensively (a primary
 * tag plus a region subtag never exceeds this in BCP 47).
 */
function parsePrimaryLanguage(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.trim();
  if (!first) return null;
  const primary = first.split(";")[0]?.split("-")[0]?.toLowerCase();
  if (!primary || primary.length > 8 || !/^[a-z]+$/.test(primary)) return null;
  return primary;
}

/**
 * Anonymous, server-side visit tracking for the /admin Live View. The client
 * (AnalyticsTracker) posts an ephemeral session id + path; we geolocate the IP
 * server-side, upsert the session (last_seen + coarse geo on first sight), and
 * record the pageview. All writes use the service role; nothing is exposed to
 * the browser. Failures are swallowed so tracking never breaks a page.
 *
 * Two things a page may say about itself with a page view, both kept only
 * when the session is first seen, and both on the privacy page:
 *   - a link tag ("email-release-1.5"), the word one of our own links ended
 *     in. It is kept in the referrer's place (lib/analytics/tag.ts).
 *   - that it is inside the Windows app, whose user agent does not say so. It
 *     is written as one word after the stored user agent
 *     (lib/platform/token.ts).
 * Neither names a reader, and the bearer token and cookies this route is sent
 * are still never read.
 *
 * Hardened:
 *   - Content-Type must be application/json.
 *   - Self-named bots and headless browsers are dropped (lib/analytics/bot.ts).
 *   - Body validated by zod (sessionId pattern + path shape).
 *   - Rate-limited: 120 events/min per IP and 600 inserts/day per IP.
 *   - Sec-Fetch-Site, when present, must be same-origin OR the request must
 *     come from one of the native shells we ship.
 *
 * Native shells call this cross-origin from https://localhost (the static
 * export has no /api), so this route answers the CORS preflight and makes a
 * narrow Sec-Fetch-Site exception for allow-listed shell origins. Without
 * both, every Android pageview was rejected and the app was invisible to
 * every dashboard. See lib/api/cors.ts for the origin allow-list.
 */
async function handlePOST(req: Request) {
  // Cheap origin sanity. Real browsers send this; bots usually don't. The
  // native shells legitimately post cross-site, so exempt only those origins.
  const sfs = req.headers.get("sec-fetch-site");
  const fromNativeShell = isAllowedNativeOrigin(req.headers.get("origin"));
  if (
    sfs &&
    sfs !== "same-origin" &&
    sfs !== "same-site" &&
    sfs !== "none" &&
    !fromNativeShell
  ) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
  }

  // Crawlers and headless browsers that name themselves are not visits. The
  // tracker already skips them in the browser; this covers anything that posts
  // here directly. Answer as if recorded, so nothing learns to rename itself.
  if (isAutomatedAgent(req.headers.get("user-agent"), req.headers.get("sec-ch-ua"))) {
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const ip = ipKey(req.headers);
  // Per-minute burst guard.
  if (await rateLimited(`track:${ip}`, 60, 120)) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = trackSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const { sessionId, path, referrer } = parsed.data;

    // Don't record visits to the admin panel itself.
    if (path.startsWith("/admin")) return NextResponse.json({ ok: true });

    const supa = createAdminClient();
    const now = new Date().toISOString();

    const { data: existing, error: existingErr } = await supa
      .from("analytics_sessions")
      .select("session_id, pageviews")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (existingErr) {
      console.error("[track] session lookup failed", existingErr.message);
    }

    if (!existing) {
      // First-sight write: tighter daily budget keeps a single IP from
      // creating millions of session rows.
      if (await rateLimited(`track-new:${ip}`, 86400, 600)) {
        return new NextResponse(null, { status: 429 });
      }
      const geo = await geolocate(clientIp(req.headers));
      // Where it came from and what it is read on, as they are kept (lib/analytics/sessionStart.ts).
      const start = sessionStart({
        referrer,
        tag: parsed.data.tag,
        app: parsed.data.app,
        userAgent: req.headers.get("user-agent"),
      });
      const acceptLanguage = parsePrimaryLanguage(
        req.headers.get("accept-language"),
      );
      const { error: insErr } = await supa
        .from("analytics_sessions")
        .insert({
          session_id: sessionId,
          first_seen: now,
          last_seen: now,
          referrer: start.referrer,
          user_agent: start.user_agent,
          accept_language: acceptLanguage,
          pageviews: 1,
          ...(geo ?? {}),
        });
      if (insErr) {
        // Don't bail on a PK conflict (race with a concurrent first
        // POST for the same sessionId — the pageview insert below
        // still wants to run). Anything else, log so we can see.
        console.error("[track] session insert failed", insErr.message);
      }
    } else {
      // Bump the denormalized per-session pageview counter so the
      // Overview hero's per-session aggregates don't get stuck at 1.
      // (The per-day totals in the chart come from analytics_pageviews
      // and don't rely on this column.)
      const { error: updErr } = await supa
        .from("analytics_sessions")
        .update({
          last_seen: now,
          pageviews: ((existing as { pageviews?: number }).pageviews ?? 0) + 1,
        })
        .eq("session_id", sessionId);
      if (updErr) {
        console.error("[track] session update failed", updErr.message);
      }
    }

    const { error: pvErr } = await supa
      .from("analytics_pageviews")
      .insert({ session_id: sessionId, path });
    if (pvErr) {
      // This was the silent failure mode that made the Traffic chart
      // appear stuck at 0. Always log so future regressions surface.
      console.error("[track] pageview insert failed", pvErr.message);
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[track] unhandled", (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
