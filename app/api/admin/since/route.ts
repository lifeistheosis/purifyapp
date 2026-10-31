import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { emailsByUserId } from "@/lib/admin/accountEmails";
import { lineFrom, type SinceEvent, type UsageMark } from "@/lib/admin/since";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { formatPrice } from "@/lib/shop/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What changed since he last looked: the Home's feed (the owner's pick for
 * Home on sheet r3-15, 2026-10-30, B and A mixed).
 *
 * THE LINE is where his previous visit to the admin ended, from his own use
 * log (lib/admin/since.ts says how), or where he last pressed Mark all as
 * seen. The page may send `at` to keep the line it already showed, or to move
 * it to now. A log that cannot be read gives the last 24 hours, and `basis`
 * says so: the page never presents a guessed line as his.
 *
 * THE ROWS are read from the tables that already hold them, each read bound
 * and checked: paid orders, refunds paid out, new readers, new Plus members
 * (the thank-you email the webhook sends for a first purchase is the only
 * record of one: entitlements keeps no start date), support tickets, blue
 * check and clergy seal requests, and the board's ticks. A source that does
 * not answer is named in `unread`, so a quiet feed is never a failed one in
 * disguise. Nothing is written.
 *
 * Admin only, like every route here: 403 to anyone else.
 */

const CAP = 100;
const NO_STORE = { headers: { "Cache-Control": "no-store" } };

type Err = { code?: string | null; message?: string | null } | null;

/** "the readers" could not be read: said in words, so the feed can name what it is missing. */
function note(unread: string[], what: string, error: Err) {
  if (!error) return;
  if (!isTableAbsent(error)) console.warn(`[admin/since] ${what} read failed`, error.message);
  unread.push(what);
}

const STORE: Record<string, string> = {
  google: "Google Play",
  apple: "the App Store",
  stripe: "the website",
};

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const now = Date.now();
  const asked = req.nextUrl.searchParams.get("at");
  const unread: string[] = [];

  // ── The line ─────────────────────────────────────────────────────────
  let rows: UsageMark[] | null = null;
  if (!asked) {
    const since30 = new Date(now - 30 * 86_400_000).toISOString();
    const { data, error } = await admin
      .from("admin_usage")
      .select("at, kind, label")
      .eq("actor_email", adminUser.email ?? "")
      .gte("at", since30)
      .order("at", { ascending: false })
      // One request's worth is enough: the line needs only his newest rows,
      // back to the first pause of half an hour, and a visit writes a few
      // dozen at most.
      .limit(1000);
    if (error) note(unread, "your use log", error);
    else rows = (data ?? []) as UsageMark[];
  }
  const line = lineFrom(rows, now, asked);
  const L = line.at;

  // ── The rows, each read on its own ───────────────────────────────────
  const [orders, refunds, readers, members, tickets, checks, seals, ticks] = await Promise.all([
    admin
      .from("shop_orders")
      .select("id, email, total_cents, payment_status, created_at, paid_at, items:shop_order_items(quantity)")
      .in("payment_status", ["paid", "refunded"])
      // Counted by when the money landed (paid_at); an order with no recorded
      // payment time by when its checkout started, as the daily route does.
      .or(`paid_at.gte."${L}",and(paid_at.is.null,created_at.gte."${L}")`)
      .order("created_at", { ascending: false })
      .limit(CAP),
    admin
      .from("shop_refund_requests")
      .select("amount_cents, processed_at, order:shop_orders(total_cents, created_at)")
      .eq("status", "processed")
      .gte("processed_at", L)
      .order("processed_at", { ascending: false })
      .limit(CAP),
    admin
      .from("profiles")
      .select("joined_at", { count: "exact" })
      .gte("joined_at", L)
      .order("joined_at", { ascending: false })
      .limit(1000),
    admin
      .from("email_sends")
      .select("user_id, created_at")
      .eq("kind", "plus_active")
      .gte("created_at", L)
      .order("created_at", { ascending: false })
      .limit(CAP),
    admin
      .from("support_tickets")
      .select("email, subject, status, created_at")
      .gte("created_at", L)
      .order("created_at", { ascending: false })
      .limit(CAP),
    admin
      .from("user_verification")
      .select("user_id, status, claim, requested_at")
      .gte("requested_at", L)
      .order("requested_at", { ascending: false })
      .limit(CAP),
    admin
      .from("clergy_verifications")
      .select("user_id, status, rank, parish, requested_at")
      .gte("requested_at", L)
      .order("requested_at", { ascending: false })
      .limit(CAP),
    admin
      .from("admin_tasks")
      .select("title, done_at, auto")
      .eq("status", "done")
      .gte("done_at", L)
      .order("done_at", { ascending: false })
      .limit(CAP),
  ]);

  const events: SinceEvent[] = [];
  let orderCents = 0;

  note(unread, "the orders", orders.error);
  for (const o of (orders.data ?? []) as {
    email: string | null;
    total_cents: number;
    payment_status: string;
    created_at: string;
    paid_at: string | null;
    items: { quantity: number }[] | null;
  }[]) {
    const items = (o.items ?? []).reduce((a, i) => a + (i.quantity ?? 0), 0);
    const kept = o.payment_status === "paid";
    if (kept) orderCents += o.total_cents;
    events.push({
      at: o.paid_at ?? o.created_at,
      kind: "order",
      mark: "good",
      title: `An order came in, ${formatPrice(o.total_cents, "usd")}`,
      detail: [items === 1 ? "1 item" : `${items} items`, o.email, kept ? null : "since refunded"].filter(Boolean).join(", "),
      tab: "orders",
      go: "Orders",
      sensitive: true,
      money: true,
    });
  }

  note(unread, "the refunds", refunds.error);
  for (const r of (refunds.data ?? []) as {
    amount_cents: number | null;
    processed_at: string;
    order: { total_cents: number; created_at: string } | { total_cents: number; created_at: string }[] | null;
  }[]) {
    const order = Array.isArray(r.order) ? r.order[0] : r.order;
    const cents = r.amount_cents ?? order?.total_cents ?? null;
    events.push({
      at: r.processed_at,
      kind: "refund",
      mark: "news",
      title: cents !== null ? `A refund went out, ${formatPrice(cents, "usd")}` : "A refund went out",
      detail: order?.created_at
        ? `an order of ${new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}`
        : "on an order",
      tab: "orders",
      go: "Orders",
      money: true,
    });
  }

  note(unread, "the readers", readers.error);
  const readerTimes = ((readers.data ?? []) as { joined_at: string }[]).map((r) => r.joined_at);

  note(unread, "the new members", members.error);
  const memberRows = (members.data ?? []) as { user_id: string | null; created_at: string }[];
  const sources = new Map<string, string | null>();
  const memberIds = [...new Set(memberRows.map((m) => m.user_id).filter((id): id is string => Boolean(id)))];
  if (memberIds.length > 0) {
    const { data } = await admin.from("entitlements").select("user_id, plus_source").in("user_id", memberIds);
    for (const e of (data ?? []) as { user_id: string; plus_source: string | null }[]) sources.set(e.user_id, e.plus_source);
  }
  for (const m of memberRows) {
    const store = m.user_id ? STORE[sources.get(m.user_id) ?? ""] : undefined;
    events.push({
      at: m.created_at,
      kind: "member",
      mark: "good",
      title: "A new Plus member",
      detail: store ? `from ${store}` : "a first purchase",
      tab: "subscriptions",
      go: "Subscriptions",
    });
  }

  note(unread, "the support tickets", tickets.error);
  for (const t of (tickets.data ?? []) as { email: string; subject: string; status: string; created_at: string }[]) {
    const open = t.status === "open" || t.status === "pending";
    events.push({
      at: t.created_at,
      kind: "ticket",
      mark: open ? "wait" : "good",
      title: `A support ticket: "${t.subject}"`,
      detail: `from ${t.email}${open ? ", no reply yet" : ", answered"}`,
      tab: "messages",
      go: "Messages",
      sensitive: true,
    });
  }

  note(unread, "the blue check requests", checks.error);
  note(unread, "the clergy seal requests", seals.error);
  const checkRows = (checks.data ?? []) as { user_id: string; status: string; claim: string | null; requested_at: string }[];
  const sealRows = (seals.data ?? []) as {
    user_id: string;
    status: string;
    rank: string | null;
    parish: string | null;
    requested_at: string;
  }[];
  // Who asked, by address: an admin deciding needs to know who it is. A
  // handful at most, so one lookup each (lib/admin/accountEmails.ts).
  const askers = await emailsByUserId([...checkRows, ...sealRows].slice(0, 20).map((r) => r.user_id)).catch(
    () => new Map<string, string>(),
  );
  for (const c of checkRows) {
    const waiting = c.status === "requested";
    events.push({
      at: c.requested_at,
      kind: "check",
      mark: waiting ? "wait" : "good",
      title: waiting ? "Asked for the blue check" : `Asked for the blue check, since ${c.status}`,
      detail: [askers.get(c.user_id), c.claim ? `"${c.claim.slice(0, 90)}"` : null].filter(Boolean).join(", ") || "a reader",
      tab: "verification",
      go: "Readers",
      sensitive: true,
    });
  }
  for (const s of sealRows) {
    const waiting = s.status === "requested";
    events.push({
      at: s.requested_at,
      kind: "seal",
      mark: waiting ? "wait" : "good",
      title: waiting ? "Asked for the clergy seal" : `Asked for the clergy seal, since ${s.status}`,
      detail: [askers.get(s.user_id), s.rank ? `a ${s.rank}` : null, s.parish].filter(Boolean).join(", ") || "a reader",
      tab: "verification",
      go: "Readers",
      sensitive: true,
    });
  }

  note(unread, "the board", ticks.error);
  for (const t of (ticks.data ?? []) as { title: string; done_at: string; auto: boolean | null }[]) {
    events.push({
      at: t.done_at,
      kind: "tick",
      mark: "good",
      title: `${t.auto ? "Ticked by the app" : "Ticked"}: ${t.title}`,
      detail: "on the board",
      tab: "calendar",
      go: "Calendar",
    });
  }

  events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return NextResponse.json(
    {
      line: line.at,
      basis: line.basis,
      now: new Date(now).toISOString(),
      events: events.slice(0, 120),
      orderCents,
      readers: {
        count: readers.error ? null : (readers.count ?? readerTimes.length),
        times: readerTimes,
      },
      unread,
    },
    NO_STORE,
  );
}
