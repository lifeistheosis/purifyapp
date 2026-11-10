import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { reportCampaign } from "@/lib/campaigns/moderation";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { mayRead, readCampaignRow } from "@/lib/campaigns/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { campaignReportSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Report a campaign: a reason to tick, and words when the reader has some
 * (lib/campaigns/moderation.ts, reportCampaign, which also says when a
 * report hides the campaign until a moderator looks).
 *
 * Signed-in only, as a report in Community is: an anonymous report cannot be
 * weighed, and cannot be held to one a reader. The answer never says whether
 * the campaign was hidden: the reporter is told the report was sent, and
 * nothing about what others have reported.
 */
async function handleReport(req: Request, id: string) {
  const who = await campaignsCaller(req);
  if (!who.open) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (await rateLimited(`campaign-report:${ipKey(req.headers)}`, 3600, 30)) {
    return NextResponse.json({ error: "Too many reports just now. Please try again shortly." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = campaignReportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  if (!who.user) return NextResponse.json({ error: "Sign in to report something." }, { status: 401 });

  const admin = createAdminClient();
  const found = await readCampaignRow(admin, id);
  if (!found.ok) {
    return found.why === "absent"
      ? NextResponse.json({ error: "Not found." }, { status: 404 })
      : NextResponse.json({ error: "Could not send that report." }, { status: 500 });
  }
  const row = found.value;
  if (!row || !mayRead(row, who.user.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (row.creator_id === who.user.id) return NextResponse.json({ error: "That is your own campaign." }, { status: 400 });

  const sent = await reportCampaign(admin, who.user, id, parsed.data.reason, parsed.data.words ?? null);
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: sent.status });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCors(await handleReport(req, id), req);
}

export const OPTIONS = corsPreflight;
