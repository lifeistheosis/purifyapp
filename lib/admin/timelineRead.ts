import { emailsByUserId } from "@/lib/admin/accountEmails";
import type { SinceEvent } from "@/lib/admin/since";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { isOwnTestOrder } from "@/lib/admin/testOrders";
import { formatPrice } from "@/lib/shop/format";
import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * What happened between two moments, read from the tables that already hold
 * it: paid orders, refunds paid out, new readers, new Plus members, support
 * tickets, blue check and clergy seal requests, and the board's ticks. Each
 * row keeps the time it happened.
 *
 * One reader for two routes: /api/admin/since (from where he last looked to
 * now, the Home's feed as it was) and /api/admin/timeline (a week at a time,
 * the log that never resets; the owner, 2026-11-04: "I don't want it to just
 * keep resetting and deleting"). Lifted out of the since route unchanged
 * apart from the window's far end, which the since route leaves open.
 *
 * A source that does not answer is named in `unread`, so a quiet window is
 * never a failed one in disguise. `full` names a source that gave its whole
 * cap, so a page can say it is showing the newest of more. Nothing is
 * written.
 */

type Admin = ReturnType<typeof createAdminClient>;
type Err = { code?: string | null; message?: string | null } | null;

export type TimelineWindow = {
  events: SinceEvent[];
  /** Paid orders' totals in the window, refunded ones left out. */
  orderCents: number;
  /** New readers: how many, and when each joined (grouped into rows by the page). */
  readers: { count: number | null; times: string[] };
  unread: string[];
  full: string[];
};

const STORE: Record<string, string> = {
  google: "Google Play",
  apple: "the App Store",
  stripe: "the website",
};

export async function readTimelineWindow(
  admin: Admin,
  from: string,
  to: string | null,
  { cap = 100, tag = "since" }: { cap?: number; tag?: string } = {},
): Promise<TimelineWindow> {
  const unread: string[] = [];
  const full: string[] = [];
  const note = (what: string, error: Err) => {
    if (!error) return;
    if (!isTableAbsent(error)) console.warn(`[admin/${tag}] ${what} read failed`, error.message);
    unread.push(what);
  };
  // The window's far end, when it has one: a filter on the query as built.
  const upTo = <Q extends { lt(column: string, value: string): unknown }>(q: Q, column: string): Q =>
    to ? (q.lt(column, to) as Q) : q;
  const paidWindow = to
    ? `and(paid_at.gte."${from}",paid_at.lt."${to}"),and(paid_at.is.null,created_at.gte."${from}",created_at.lt."${to}")`
    : `paid_at.gte."${from}",and(paid_at.is.null,created_at.gte."${from}")`;

  const [orders, refunds, readers, members, tickets, checks, seals, ticks] = await Promise.all([
    admin
      .from("shop_orders")
      .select("id, email, total_cents, payment_status, created_at, paid_at, items:shop_order_items(quantity)")
      .in("payment_status", ["paid", "refunded"])
      // Counted by when the money landed (paid_at); an order with no recorded
      // payment time by when its checkout started, as the daily route does.
      .or(paidWindow)
      .order("created_at", { ascending: false })
      .limit(cap),
    upTo(
      admin
        .from("shop_refund_requests")
        .select("amount_cents, processed_at, order:shop_orders(total_cents, created_at)")
        .eq("status", "processed")
        .gte("processed_at", from),
      "processed_at",
    )
      .order("processed_at", { ascending: false })
      .limit(cap),
    upTo(admin.from("profiles").select("joined_at", { count: "exact" }).gte("joined_at", from), "joined_at")
      .order("joined_at", { ascending: false })
      .limit(1000),
    upTo(admin.from("email_sends").select("user_id, created_at").eq("kind", "plus_active").gte("created_at", from), "created_at")
      .order("created_at", { ascending: false })
      .limit(cap),
    upTo(admin.from("support_tickets").select("email, subject, status, created_at").gte("created_at", from), "created_at")
      .order("created_at", { ascending: false })
      .limit(cap),
    upTo(admin.from("user_verification").select("user_id, status, claim, requested_at").gte("requested_at", from), "requested_at")
      .order("requested_at", { ascending: false })
      .limit(cap),
    upTo(
      admin.from("clergy_verifications").select("user_id, status, rank, parish, requested_at").gte("requested_at", from),
      "requested_at",
    )
      .order("requested_at", { ascending: false })
      .limit(cap),
    upTo(admin.from("admin_tasks").select("title, done_at, auto").eq("status", "done").gte("done_at", from), "done_at")
      .order("done_at", { ascending: false })
      .limit(cap),
  ]);

  const events: SinceEvent[] = [];
  let orderCents = 0;
  const capped = (what: string, rows: unknown[] | null) => {
    if ((rows?.length ?? 0) >= cap) full.push(what);
  };

  note("the orders", orders.error);
  capped("the orders", orders.data);
  for (const o of (orders.data ?? []) as {
    email: string | null;
    total_cents: number;
    payment_status: string;
    created_at: string;
    paid_at: string | null;
    items: { quantity: number }[] | null;
  }[]) {
    // His own test orders are no sale, and no news (his item 54, lib/admin/testOrders.ts).
    if (isOwnTestOrder(o)) continue;
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
      cents: kept ? o.total_cents : 0,
    });
  }

  note("the refunds", refunds.error);
  capped("the refunds", refunds.data);
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

  note("the readers", readers.error);
  const readerTimes = ((readers.data ?? []) as { joined_at: string }[]).map((r) => r.joined_at);

  note("the new members", members.error);
  capped("the new members", members.data);
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

  note("the support tickets", tickets.error);
  capped("the support tickets", tickets.data);
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

  note("the blue check requests", checks.error);
  note("the clergy seal requests", seals.error);
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

  note("the board", ticks.error);
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

  return {
    events,
    orderCents,
    readers: { count: readers.error ? null : (readers.count ?? readerTimes.length), times: readerTimes },
    unread,
    full,
  };
}
