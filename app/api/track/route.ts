import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { geolocate, clientIp } from "@/lib/analytics/geo";
import { trackSchema } from "@/lib/security/schemas";
import { rateLimited, ipKey } from "@/lib/security/ratelimit";

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
 * Hardened:
 *   - Content-Type must be application/json.
 *   - Body validated by zod (sessionId pattern + path shape).
 *   - Rate-limited: 120 events/min per IP and 600 inserts/day per IP.
 *   - Sec-Fetch-Site, when present, must be same-origin.
 */
export async function POST(req: NextRequest) {
  // Cheap origin sanity. Real browsers send this; bots usually don't.
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs && sfs !== "same-origin" && sfs !== "same-site" && sfs !== "none") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
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
      const ua = (req.headers.get("user-agent") ?? "").slice(0, 300);
      const acceptLanguage = parsePrimaryLanguage(
        req.headers.get("accept-language"),
      );
      const { error: insErr } = await supa
        .from("analytics_sessions")
        .insert({
          session_id: sessionId,
          first_seen: now,
          last_seen: now,
          referrer: referrer ?? null,
          user_agent: ua,
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
