/**
 * Who is owed a note about the cart they left (asked for 2026-09-30).
 *
 * ── The sequence ────────────────────────────────────────────────────────
 *
 *   A DAY AFTER the cart was last touched: one plain note that it is still
 *   there, naming what is in it. No discount, no deadline.
 *   WHEN A CART DEAL OPENS on a line in it (lib/shop/cartDeals.ts, the deal
 *   the owner already runs in the cart, margin floor and all): one note
 *   saying so, with the real percentage and the real end of the window,
 *   which is the moment checkout stops honouring it. With the owner's default
 *   of three days that is the "later, with a discount" step of the brief.
 *
 * Both are marketing, so both go only to readers who turned on "New in the
 * shop" (lib/email/marketing.ts resolves that list itself), each through the
 * send-once ledger under a key that names the cart's state, so a cart is
 * reminded about once, and again only if it changes and is left again. Each
 * has its own switch in the admin, and both are off until the owner turns
 * them on.
 *
 * ── Who is left alone ───────────────────────────────────────────────────
 *
 *   - A cart nobody is signed in to: there is no address to write to.
 *   - A cart touched in the last day: they may still be shopping.
 *   - A cart left more than a week: a note that late is noise.
 *   - Anyone who has paid for an order since the cart was last touched.
 *
 * Pure. The carts, the payments and the clock are inputs.
 */

export const REMIND_AFTER_MS = 24 * 3_600_000;
export const REMIND_WITHIN_MS = 7 * 86_400_000;

export type ReminderCart = {
  cart_token: string;
  user_id: string | null;
  items: unknown;
  updated_at: string;
};

export type ReminderLine = { slug: string; title: string; quantity: number };

export type OwedReminder = {
  userId: string;
  cartToken: string;
  /** The cart's state, for the send-once key: it changes when the cart does. */
  stateKey: string;
  lines: ReminderLine[];
};

export function cartLines(items: unknown): ReminderLine[] {
  if (!Array.isArray(items)) return [];
  const out: ReminderLine[] = [];
  for (const it of items) {
    const row = it as { slug?: unknown; title?: unknown; quantity?: unknown } | null;
    if (typeof row?.slug !== "string" || typeof row.title !== "string") continue;
    const q = typeof row.quantity === "number" && row.quantity > 0 ? Math.round(row.quantity) : 1;
    out.push({ slug: row.slug, title: row.title, quantity: q });
  }
  return out;
}

export function remindersOwed(
  carts: ReminderCart[],
  lastPaidAt: ReadonlyMap<string, number>,
  now: number,
): OwedReminder[] {
  const owed: OwedReminder[] = [];
  const seen = new Set<string>();
  // Newest cart first, so an account with two devices is written to once,
  // about the cart it touched last.
  const sorted = [...carts].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  for (const c of sorted) {
    if (!c.user_id || seen.has(c.user_id)) continue;
    const touched = Date.parse(c.updated_at);
    if (!Number.isFinite(touched)) continue;
    const idle = now - touched;
    if (idle < REMIND_AFTER_MS || idle > REMIND_WITHIN_MS) continue;
    const paid = lastPaidAt.get(c.user_id);
    if (paid != null && paid >= touched) continue;
    const lines = cartLines(c.items);
    if (lines.length === 0) continue;
    seen.add(c.user_id);
    owed.push({ userId: c.user_id, cartToken: c.cart_token, stateKey: c.updated_at.slice(0, 16), lines });
  }
  return owed;
}

export function reminderKey(r: OwedReminder): string {
  return `cart_reminder:${r.userId}:${r.stateKey}`;
}

export function dealKey(userId: string, slug: string, endsAt: number): string {
  return `cart_deal:${userId}:${slug}:${endsAt}`;
}

export type NoteSend = { user_id: string | null; kind: string; created_at: string };
export type NoteOutcome = { sent: number; recovered: number };

/**
 * How many notes of each kind were followed, within a week, by a paid order
 * from the same reader. "Followed by", not "caused": a reader who would have
 * come back anyway is counted too, and the admin says so.
 */
export function outcomesOfNotes(
  sends: NoteSend[],
  paid: { user_id: string | null; created_at: string }[],
  windowMs = 7 * 86_400_000,
): Record<string, NoteOutcome> {
  const paidAt = new Map<string, number[]>();
  for (const p of paid) {
    if (!p.user_id) continue;
    const list = paidAt.get(p.user_id) ?? [];
    list.push(Date.parse(p.created_at));
    paidAt.set(p.user_id, list);
  }
  const out: Record<string, NoteOutcome> = {};
  for (const s of sends) {
    const o = (out[s.kind] ??= { sent: 0, recovered: 0 });
    o.sent += 1;
    if (!s.user_id) continue;
    const at = Date.parse(s.created_at);
    if ((paidAt.get(s.user_id) ?? []).some((t) => t > at && t - at <= windowMs)) o.recovered += 1;
  }
  return out;
}
