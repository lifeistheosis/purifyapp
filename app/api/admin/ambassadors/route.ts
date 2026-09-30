import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { emailsByUserId, userIdByEmail } from "@/lib/admin/accountEmails";
import { logActivity } from "@/lib/admin/activityLog";
import { balance, MIN_PAYOUT_CENTS, type LedgerRow } from "@/lib/ambassadors/ledger";
import { autoPayoutsOn, payAmbassador } from "@/lib/ambassadors/payouts";
import { codeFromName, normalizeCode, referralLink } from "@/lib/ambassadors/referral";
import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The owner's side of the ambassador program (invite only, 10% on EIKON).
 *
 * GET lists every ambassador with their link, visits in the last 30 days,
 * orders brought in, balance by status and last payout, plus the automatic
 * payout switch. POST does one thing at a time: invite a reader by the email
 * on their account, pause or resume an ambassador, pay a cleared balance now,
 * or flip automatic monthly payouts.
 *
 * `present: false` until supabase/migrations/20260930_ambassadors.sql has run;
 * every action answers 409 until then rather than pretending to work.
 */

function absent(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find/i.test(error.message ?? "")));
}

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("ambassadors")
    .select("id, user_id, code, display_name, status, commission_bps, stripe_account_id, payouts_enabled, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ present: !absent(error), ambassadors: [], autoPayouts: false, error: absent(error) ? null : error.message });
  }
  const list = (rows ?? []) as {
    id: string;
    user_id: string;
    code: string;
    display_name: string | null;
    status: string;
    commission_bps: number;
    stripe_account_id: string | null;
    payouts_enabled: boolean;
    created_at: string;
  }[];
  const ids = list.map((a) => a.id);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [clicksRes, ledgerRes, payoutsRes, emails, auto] = await Promise.all([
    ids.length ? admin.from("ambassador_clicks").select("ambassador_id, clicks").in("ambassador_id", ids).gte("day", since) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("commission_ledger").select("ambassador_id, status, amount_cents, created_at").in("ambassador_id", ids) : Promise.resolve({ data: [] }),
    ids.length
      ? admin.from("ambassador_payouts").select("ambassador_id, period, amount_cents, status, error, created_at").in("ambassador_id", ids).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    emailsByUserId(list.map((a) => a.user_id)).catch(() => new Map<string, string>()),
    autoPayoutsOn(admin),
  ]);

  const clicks = new Map<string, number>();
  for (const c of (clicksRes.data ?? []) as { ambassador_id: string; clicks: number }[]) {
    clicks.set(c.ambassador_id, (clicks.get(c.ambassador_id) ?? 0) + c.clicks);
  }
  const ledger = new Map<string, LedgerRow[]>();
  for (const r of (ledgerRes.data ?? []) as (LedgerRow & { ambassador_id: string })[]) {
    const l = ledger.get(r.ambassador_id) ?? [];
    l.push(r);
    ledger.set(r.ambassador_id, l);
  }
  const lastPayout = new Map<string, { period: string; amount_cents: number; status: string; error: string | null }>();
  for (const p of (payoutsRes.data ?? []) as { ambassador_id: string; period: string; amount_cents: number; status: string; error: string | null }[]) {
    if (!lastPayout.has(p.ambassador_id)) lastPayout.set(p.ambassador_id, p);
  }

  return NextResponse.json(
    {
      present: true,
      autoPayouts: auto,
      minPayoutCents: MIN_PAYOUT_CENTS,
      ambassadors: list.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.display_name,
        email: emails.get(a.user_id) ?? null,
        status: a.status,
        rateBps: a.commission_bps,
        connected: Boolean(a.stripe_account_id),
        payoutsReady: a.payouts_enabled,
        link: referralLink(SITE_URL, a.code),
        clicks30: clicks.get(a.id) ?? 0,
        balance: balance(ledger.get(a.id) ?? []),
        lastPayout: lastPayout.get(a.id) ?? null,
        since: a.created_at,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    email: z.string().email().max(320),
    name: z.string().trim().min(1).max(80).optional(),
    code: z.string().max(24).optional(),
  }),
  z.object({ action: z.literal("pause"), id: z.string().uuid() }),
  z.object({ action: z.literal("resume"), id: z.string().uuid() }),
  z.object({ action: z.literal("pay"), id: z.string().uuid() }),
  z.object({ action: z.literal("autoPayouts"), on: z.boolean() }),
]);

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const body = parsed.data;
  const admin = createAdminClient();
  const probe = await admin.from("ambassadors").select("id").limit(1);
  if (probe.error) {
    return NextResponse.json(
      { error: absent(probe.error) ? "Run supabase/migrations/20260930_ambassadors.sql in the Supabase SQL editor first." : probe.error.message },
      { status: 409 },
    );
  }
  const actor = adminUser.email ?? null;

  if (body.action === "invite") {
    const userId = await userIdByEmail(body.email);
    if (!userId) return NextResponse.json({ error: "No Purify account uses that email. Ask them to make one first." }, { status: 404 });
    const { data: existing } = await admin.from("ambassadors").select("code").eq("user_id", userId).maybeSingle();
    if (existing) return NextResponse.json({ error: `Already an ambassador, with the code ${(existing as { code: string }).code}.` }, { status: 409 });
    const { data: codes } = await admin.from("ambassadors").select("code");
    const taken = new Set(((codes ?? []) as { code: string }[]).map((c) => c.code));
    const wanted = body.code ? normalizeCode(body.code) : null;
    if (body.code && !wanted) return NextResponse.json({ error: "A code is 3 to 24 letters, numbers or hyphens." }, { status: 400 });
    if (wanted && taken.has(wanted)) return NextResponse.json({ error: "That code is taken." }, { status: 409 });
    const code = wanted ?? codeFromName(body.name ?? body.email.split("@")[0], taken);
    const { error } = await admin
      .from("ambassadors")
      .insert({ user_id: userId, code, display_name: body.name ?? null, invited_by: actor });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void logActivity({ actorEmail: actor, action: "ambassador.invite", entityType: "ambassadors", entityId: code, detail: { email: body.email } });
    return NextResponse.json({ ok: true, code, link: referralLink(SITE_URL, code) });
  }

  if (body.action === "pause" || body.action === "resume") {
    const status = body.action === "pause" ? "paused" : "active";
    const { error } = await admin.from("ambassadors").update({ status, updated_at: new Date().toISOString() }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void logActivity({ actorEmail: actor, action: `ambassador.${body.action}`, entityType: "ambassadors", entityId: body.id });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "pay") {
    // By hand: whatever has cleared, any amount over a dollar, its own period.
    const result = await payAmbassador(admin, body.id, { period: `manual-${new Date().toISOString()}`, minCents: 100 });
    void logActivity({ actorEmail: actor, action: "ambassador.pay", entityType: "ambassadors", entityId: body.id, detail: { result } });
    if (!result.ok) return NextResponse.json({ error: "error" in result ? result.error : `Nothing sent: ${result.skipped}.` }, { status: 409 });
    return NextResponse.json({ ok: true, amountCents: result.amountCents });
  }

  const { error } = await admin.from("shop_settings").update({ ambassador_auto_payouts: body.on, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  void logActivity({ actorEmail: actor, action: "ambassador.auto_payouts", entityType: "shop_settings", entityId: "1", detail: { on: body.on } });
  return NextResponse.json({ ok: true });
}
