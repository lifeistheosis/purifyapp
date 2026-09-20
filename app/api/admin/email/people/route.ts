import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { allAccounts } from "@/lib/admin/users";
import { readLedger } from "@/lib/email/ledgerRead";
import { mailByPerson, mergeMail } from "@/lib/email/mailings";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everyone with an account, and the email each one has had from Purify.
 *
 * One row per account: joined, last signed in, which lists they switched on,
 * how many emails reached them, how many failed, and the last one. The screen
 * searches, sorts and pages it; one person's full history is
 * /api/admin/email/people/[id].
 *
 * Personal data, admin only, never cached. The screen masks addresses in
 * streamer mode like every other admin table.
 */

export type PersonRow = {
  id: string;
  email: string;
  joinedAt: string;
  lastSignInAt: string | null;
  shop: boolean;
  updates: boolean;
  received: number;
  failed: number;
  lastAt: string | null;
  lastSubject: string | null;
};

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  let accounts: Awaited<ReturnType<typeof allAccounts>>;
  try {
    accounts = await allAccounts(admin);
  } catch (e) {
    return NextResponse.json({ error: `Could not read accounts: ${(e as Error).message}` }, { status: 502 });
  }
  const [ledger, prefs] = await Promise.all([
    readLedger(admin),
    admin.from("email_preferences").select("user_id, shop_offers, product_updates").limit(50000),
  ]);
  const lists = new Map(
    ((prefs.data ?? []) as { user_id: string; shop_offers: boolean; product_updates: boolean }[]).map((p) => [
      p.user_id,
      p,
    ]),
  );
  const { byUser, byEmail } = mailByPerson(ledger.rows);

  const people: PersonRow[] = accounts.accounts.map((a) => {
    const mail = mergeMail(byUser.get(a.id), byEmail.get(a.email.toLowerCase()));
    const l = lists.get(a.id);
    return {
      id: a.id,
      email: a.email,
      joinedAt: a.createdAt,
      lastSignInAt: a.lastSignInAt,
      shop: l?.shop_offers ?? false,
      updates: l?.product_updates ?? false,
      received: mail.received,
      failed: mail.failed,
      lastAt: mail.lastAt,
      lastSubject: mail.lastSubject,
    };
  });

  return NextResponse.json(
    {
      people,
      complete: accounts.complete,
      historyStart: ledger.rows[0]?.created_at ?? null,
      ledgerError: ledger.error,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
