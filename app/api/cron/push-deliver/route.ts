import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hourly delivery of opt-in prayer reminders. Walks every push
 * subscription row, determines whether the current UTC hour maps to the
 * user's local morning_time or evening_time, and dispatches a tiny
 * notification via the Web Push protocol.
 *
 * Auth: x-cron-secret header (same shape as /api/cron/bmc-snapshot).
 *
 * Requires VAPID env vars to actually send; without them the route
 * returns a count of would-have-sent rows so an admin can dry-run.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      req.headers.get("x-cron-secret") ??
      req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const supa = createAdminClient();
  const { data: rows } = await supa
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, morning_time, evening_time, timezone");

  const now = new Date();
  const candidates: {
    endpoint: string;
    p256dh: string;
    auth: string;
    kind: "morning" | "evening";
  }[] = [];

  for (const r of rows ?? []) {
    const tz = (r.timezone as string) || "UTC";
    const local = nowInTz(now, tz);
    const hhmm = `${String(local.getHours()).padStart(2, "0")}:${String(
      local.getMinutes(),
    ).padStart(2, "0")}`;
    // Match to the hour; we run hourly so a :15 → next-hour drift is fine.
    if (r.morning_time && (r.morning_time as string).slice(0, 2) === hhmm.slice(0, 2)) {
      candidates.push({
        endpoint: r.endpoint as string,
        p256dh: r.p256dh as string,
        auth: r.auth as string,
        kind: "morning",
      });
    } else if (
      r.evening_time &&
      (r.evening_time as string).slice(0, 2) === hhmm.slice(0, 2)
    ) {
      candidates.push({
        endpoint: r.endpoint as string,
        p256dh: r.p256dh as string,
        auth: r.auth as string,
        kind: "evening",
      });
    }
  }

  const vapidPub = process.env.VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPub || !vapidPriv || !vapidSubject) {
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      reason: "VAPID env vars not set",
      candidateCount: candidates.length,
    });
  }

  // Lazy-import so the module doesn't need to be installed locally for the
  // dry-run to work. Render runs the prod build with web-push present.
  let webpush: typeof import("web-push") | null = null;
  try {
    webpush = (await import("web-push")).default ?? (await import("web-push"));
  } catch {
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      reason: "web-push not installed",
      candidateCount: candidates.length,
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPub, vapidPriv);

  let sent = 0;
  let failed = 0;
  for (const c of candidates) {
    const payload = JSON.stringify({
      kind: c.kind,
      title: c.kind === "morning" ? "Morning prayer" : "Evening prayer",
      body:
        c.kind === "morning"
          ? "Open the morning rule when you rise."
          : "Open the evening rule when you lie down.",
      url: c.kind === "morning" ? "/prayers/morning" : "/prayers/evening",
    });
    try {
      await webpush.sendNotification(
        {
          endpoint: c.endpoint,
          keys: { p256dh: c.p256dh, auth: c.auth },
        },
        payload,
      );
      sent++;
      await supa
        .from("push_subscriptions")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("endpoint", c.endpoint);
    } catch (e) {
      failed++;
      // 410 Gone → endpoint stale; delete it so we stop trying.
      const msg = String(e);
      if (msg.includes("410") || msg.includes("404")) {
        await supa.from("push_subscriptions").delete().eq("endpoint", c.endpoint);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, failed, candidateCount: candidates.length });
}

function nowInTz(date: Date, tz: string): Date {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(date).map((p) => [p.type, p.value]),
    );
    return new Date(
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
      ),
    );
  } catch {
    return date;
  }
}
