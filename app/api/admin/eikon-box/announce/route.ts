import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAudience } from "@/lib/push/audience";
import { broadcast, broadcastStatus } from "@/lib/push/send";
import { emailEnabled } from "@/lib/email/send";
import { emailsByUserId } from "@/lib/admin/users";
import { sendDropOpenEmail } from "@/lib/eikonBox/dropEmails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tell every active Pro member that a drop is open.
 *
 * DELIBERATELY SEPARATE from opening the drop. Moving a drop to 'open' is
 * reversible and reaches nobody who is not already looking; an announcement
 * to every paying member is irreversible, and a typo, a wrong month, or a
 * half-finished teaser is permanent. So this is its own call, and it carries
 * the same `confirm: true` literal the push route uses.
 *
 * Push reuses the existing broadcast machinery and logs to push_broadcasts:
 * that table's audience CHECK already allows 'pro' and it is applied in
 * production, so there is no second send log to keep in step.
 *
 * Both transports report honestly. broadcast() dry-runs when no credentials
 * are set and broadcastStatus reports `enqueued` rather than `sent`;
 * sendEmail no-ops with a skip when there is no provider. The caller shows
 * those numbers so the owner never believes an announcement went out when
 * it did not.
 */
const schema = z.object({
  dropId: z.string().uuid(),
  push: z
    .object({
      title: z.string().min(1).max(80),
      body: z.string().min(1).max(300),
    })
    .optional(),
  email: z.object({ subject: z.string().min(1).max(160) }).optional(),
  confirm: z.literal(true),
});

/** Send at most this many emails at once, so the provider is not hammered. */
const EMAIL_CONCURRENCY = 4;

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { dropId, push, email } = parsed.data;
  if (!push && !email) {
    return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: drop } = await admin
    .from("eikon_drops")
    .select("id, title, teaser, status, claims_close_at")
    .eq("id", dropId)
    .maybeSingle();
  if (!drop) return NextResponse.json({ error: "Drop not found." }, { status: 404 });
  if (drop.status !== "open") {
    return NextResponse.json(
      { error: "Open the drop before announcing it." },
      { status: 409 },
    );
  }

  const out: {
    push?: { status: string; recipients: number };
    email?: { sent: number; skipped: number; failed: number };
  } = {};

  if (push) {
    const resolved = await resolveAudience(admin, "pro");
    const result = await broadcast(
      admin,
      { title: push.title, body: push.body, url: "/account/eikon-box" },
      { webSubs: resolved.webSubs, tokens: resolved.tokens },
    );
    const status = broadcastStatus(result);
    await admin.from("push_broadcasts").insert({
      title: push.title,
      body: push.body,
      url: "/account/eikon-box",
      audience: "pro",
      recipients_count: resolved.total,
      created_by_email: adminUser.email ?? null,
      status,
    });
    out.push = { status, recipients: resolved.total };
  }

  if (email) {
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    if (!emailEnabled()) {
      // Be explicit rather than silently counting zero: the panel shows this.
      out.email = { sent: 0, skipped: 0, failed: 0 };
    } else {
      const { data: ents } = await admin
        .from("entitlements")
        .select("user_id")
        .gt("pro_until", new Date().toISOString())
        .limit(2000);
      const ids = (ents ?? []).map((e) => e.user_id as string);
      const byId = await emailsByUserId(admin, ids);
      const addresses = ids
        .map((id) => byId.get(id))
        .filter((a): a is string => Boolean(a));

      // One message per recipient, never a shared To or BCC.
      for (let i = 0; i < addresses.length; i += EMAIL_CONCURRENCY) {
        const batch = addresses.slice(i, i + EMAIL_CONCURRENCY);
        const results = await Promise.all(
          batch.map((to) =>
            sendDropOpenEmail({
              to,
              subject: email.subject,
              dropTitle: drop.title,
              teaser: drop.teaser,
              claimsCloseAt: drop.claims_close_at,
            }).catch(() => ({ ok: false, error: "threw" })),
          ),
        );
        for (const r of results) {
          if (r.ok) sent += 1;
          else if ("skipped" in r && r.skipped) skipped += 1;
          else failed += 1;
        }
      }
      out.email = { sent, skipped, failed };
    }
  }

  return NextResponse.json({ ok: true, ...out });
}
