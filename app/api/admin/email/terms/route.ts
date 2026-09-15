import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { allAccountEmails } from "@/lib/admin/users";
import { sendEmailOnce } from "@/lib/email/ledger";
import type { SendOnceResult } from "@/lib/email/sendOnce";
import { longDate, termsChangedEmail } from "@/lib/email/templates/account";
import { TERMS_VERSION } from "@/lib/legal/version";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tell every account the terms changed.
 *
 * Legally required and, until 2026-09-14, missing: bumping TERMS_VERSION
 * recorded a fresh acceptance at the next sign-in and told nobody, so a reader
 * who never signed in again was never told at all.
 *
 * TO EVERYONE, REGARDLESS OF PREFERENCE. A terms change is not marketing, and
 * an unsubscribe must not be able to hide it.
 *
 * ONCE PER VERSION PER ACCOUNT. Keyed terms:<version>:<user>, so pressing Send
 * again, or after a partial failure, reaches only the people who did not get
 * it. It is safe to press twice, and the preview says how many already have.
 *
 * GET is the preview (the exact email, who it goes to). POST sends, and only
 * with confirm: true and the version the preview showed, so a deploy that
 * changed TERMS_VERSION between the two cannot send the wrong notice.
 */

const CONCURRENCY = 4;

function effectiveDate(): Date {
  return new Date(`${TERMS_VERSION}T00:00:00Z`);
}

async function alreadySent(admin: ReturnType<typeof createAdminClient>): Promise<number | null> {
  const { count, error } = await admin
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .like("dedupe_key", `terms:${TERMS_VERSION}:%`)
    .eq("status", "sent");
  return error ? null : (count ?? 0);
}

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const email = termsChangedEmail({ effective: effectiveDate() });
  const [sent, audience] = await Promise.all([
    alreadySent(admin),
    allAccountEmails(admin).catch((e: Error) => ({ error: e.message })),
  ]);

  return NextResponse.json({
    version: TERMS_VERSION,
    effective: longDate(effectiveDate()),
    subject: email.subject,
    text: email.text,
    accounts: "accounts" in audience ? audience.accounts.length : null,
    complete: "accounts" in audience ? audience.complete : false,
    audienceError: "error" in audience ? audience.error : null,
    /** Null when email_sends is not applied, which also means Send will refuse. */
    alreadySent: sent,
  });
}

const Body = z.object({
  confirm: z.literal(true),
  version: z.string(),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (await rateLimited(`email-terms:${adminUser.id}`, 300, 3)) {
    return NextResponse.json({ error: "Give it a few minutes between sends." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirm the send first." }, { status: 400 });
  }
  if (parsed.data.version !== TERMS_VERSION) {
    return NextResponse.json(
      { error: `The terms version is now ${TERMS_VERSION}, not ${parsed.data.version}. Reload and check the notice again.` },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  if ((await alreadySent(admin)) === null) {
    return NextResponse.json(
      { error: "email_sends is not applied, so there is no way to send each notice once. Nothing was sent." },
      { status: 503 },
    );
  }

  let audience: Awaited<ReturnType<typeof allAccountEmails>>;
  try {
    audience = await allAccountEmails(admin);
  } catch (e) {
    return NextResponse.json({ error: `Could not read accounts: ${(e as Error).message}` }, { status: 502 });
  }
  if (!audience.complete) {
    return NextResponse.json(
      { error: "There are more accounts than this can read in one pass. Nothing was sent, because a legal notice that reaches only some accounts is worse than a delay." },
      { status: 409 },
    );
  }

  const email = termsChangedEmail({ effective: effectiveDate() });
  const counts: Record<SendOnceResult["status"], number> = {
    sent: 0,
    skipped: 0,
    failed: 0,
    duplicate: 0,
    unavailable: 0,
  };
  const queue = [...audience.accounts];
  const worker = async () => {
    for (let a = queue.shift(); a; a = queue.shift()) {
      const r = await sendEmailOnce(admin, {
        dedupeKey: `terms:${TERMS_VERSION}:${a.id}`,
        kind: "terms_changed",
        userId: a.id,
        to: a.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      counts[r.status] += 1;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "email.terms_notice",
    entityType: "terms_version",
    entityId: TERMS_VERSION,
    detail: { accounts: audience.accounts.length, ...counts },
  });

  return NextResponse.json({ version: TERMS_VERSION, accounts: audience.accounts.length, ...counts });
}
