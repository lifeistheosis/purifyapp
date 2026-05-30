import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { BLOCKED_BOTS, BOT_HINT_RE } from "@/lib/admin/blockedBots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 7-day rolling audit of the robots.txt block list. Reads
// analytics_sessions.user_agent and groups hits by which blocked-bot
// signature matched. Also surfaces unknown bot-shaped UAs that don't
// match any blocked entry so the operator can decide to add them.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

  const { data: rows, error } = await supa
    .from("analytics_sessions")
    .select("user_agent, first_seen")
    .gte("first_seen", since)
    .not("user_agent", "is", null)
    .limit(50_000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const blockedHits = new Map<string, number>();
  const unknownHits = new Map<string, number>();
  let totalSessions = 0;

  for (const r of rows ?? []) {
    totalSessions++;
    const ua = (r.user_agent as string) ?? "";
    let matched = false;
    for (const bot of BLOCKED_BOTS) {
      if (ua.toLowerCase().includes(bot.toLowerCase())) {
        blockedHits.set(bot, (blockedHits.get(bot) ?? 0) + 1);
        matched = true;
        break;
      }
    }
    if (!matched && BOT_HINT_RE.test(ua)) {
      // Truncate to first 80 chars so the rollup key is stable.
      const truncated = ua.slice(0, 80);
      unknownHits.set(truncated, (unknownHits.get(truncated) ?? 0) + 1);
    }
  }

  const blocked = [...blockedHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([bot, count]) => ({ bot, count }));
  const unknown = [...unknownHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([userAgent, count]) => ({ userAgent, count }));

  const totalBlocked = blocked.reduce((s, b) => s + b.count, 0);
  const totalUnknown = unknown.reduce((s, u) => s + u.count, 0);

  return NextResponse.json(
    {
      windowDays: 7,
      totalSessions,
      totalBlocked,
      totalUnknown,
      blockedBots: BLOCKED_BOTS,
      blocked,
      unknown,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
