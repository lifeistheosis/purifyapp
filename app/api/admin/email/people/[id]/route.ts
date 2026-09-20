import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { readPersonLedger } from "@/lib/email/ledgerRead";
import { mailingKeyOf, mailingLabel } from "@/lib/email/mailings";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One person's whole email history, newest first, as the send log has it. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data?.user?.email) return NextResponse.json({ error: "No such account." }, { status: 404 });

  const { rows, error: ledgerError } = await readPersonLedger(admin, { id, email: data.user.email });
  return NextResponse.json(
    {
      person: { id, email: data.user.email, joinedAt: data.user.created_at, lastSignInAt: data.user.last_sign_in_at ?? null },
      sends: rows.map((r) => ({
        mailing: mailingLabel(mailingKeyOf(r), r.kind),
        subject: r.subject,
        status: r.status,
        error: r.error ?? null,
        at: r.sent_at ?? r.created_at,
      })),
      ledgerError,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
