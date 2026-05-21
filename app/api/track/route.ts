import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { geolocate, clientIp } from "@/lib/analytics/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Anonymous, server-side visit tracking for the /admin Live View. The client
 * (AnalyticsTracker) posts an ephemeral session id + path; we geolocate the IP
 * server-side, upsert the session (last_seen + coarse geo on first sight), and
 * record the pageview. All writes use the service role; nothing is exposed to
 * the browser. Failures are swallowed so tracking never breaks a page.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const sessionId = String(body?.sessionId ?? "").slice(0, 64);
    const path = String(body?.path ?? "").slice(0, 512);
    const referrer = body?.referrer ? String(body.referrer).slice(0, 512) : null;
    if (!sessionId || !path) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // Don't record visits to the admin panel itself.
    if (path.startsWith("/admin")) return NextResponse.json({ ok: true });

    const supa = createAdminClient();
    const now = new Date().toISOString();

    const { data: existing } = await supa
      .from("analytics_sessions")
      .select("session_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!existing) {
      const geo = await geolocate(clientIp(req.headers));
      const ua = (req.headers.get("user-agent") ?? "").slice(0, 300);
      await supa.from("analytics_sessions").insert({
        session_id: sessionId,
        first_seen: now,
        last_seen: now,
        referrer,
        user_agent: ua,
        pageviews: 1,
        ...(geo ?? {}),
      });
    } else {
      await supa
        .from("analytics_sessions")
        .update({ last_seen: now })
        .eq("session_id", sessionId);
    }

    await supa.from("analytics_pageviews").insert({ session_id: sessionId, path });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
