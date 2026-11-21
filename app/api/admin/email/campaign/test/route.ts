import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { draftCampaign, isCampaignKind } from "@/lib/email/campaignDrafts";
import { sendLoggedEmail } from "@/lib/email/ledger";
import { postalAddress, renderMarketing } from "@/lib/email/marketing";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A test send: the draft as it would go, to the signed-in admin's own address
 * and to no one else (the owner's word, 2026-11-21: "test send to my email
 * only"). A send he presses for a release goes to every account at once and
 * the first-send guard does not hold it (lib/email/look.ts), so until this
 * route there was no way to see a release letter in a real inbox first.
 *
 * It starts no campaign and no job, records no mailing, and counts toward no
 * reader's cadence: the real send can still go afterwards. The address is the
 * session's, never one the request names, so it cannot be pointed at anyone
 * else. The subject says it is a test. The unsubscribe button leads to the
 * page itself, as the first-look copy's does. It is refused without the
 * postal address, as every list email is (lib/email/consent.ts).
 */
const Body = z.object({ kind: z.string() });

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const to = adminUser.email?.trim();
  if (!to) return NextResponse.json({ error: "Your account has no email address to send the test to." }, { status: 400 });
  if (await rateLimited(`email-campaign-test:${adminUser.id}`, 300, 5)) {
    return NextResponse.json({ error: "Give it a few minutes between tests." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isCampaignKind(parsed.data.kind)) return NextResponse.json({ error: "Choose an email first." }, { status: 400 });
  const address = postalAddress();
  if (!address) {
    return NextResponse.json({ error: "Held until EMAIL_POSTAL_ADDRESS is set on the server. The law requires it on marketing email." }, { status: 409 });
  }

  try {
    const draft = await draftCampaign(createAdminClient(), parsed.data.kind);
    if (!draft.body) return NextResponse.json({ error: draft.reason ?? "There is nothing to send." }, { status: 409 });
    const email = renderMarketing(draft.body, draft.list, "", address);
    const sent = await sendLoggedEmail("campaign_test", {
      to,
      subject: `[Test] ${email.subject}`,
      html: email.html,
      text: email.text,
    });
    if (!sent.ok) return NextResponse.json({ error: sent.error ?? "The test did not go." }, { status: 502 });
    void logActivity({
      actorEmail: to,
      action: "email.campaign_test",
      entityType: "email_campaign",
      entityId: `${parsed.data.kind}:${draft.periodKey}`,
      detail: { to },
    });
    return NextResponse.json({ ok: true, to });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
