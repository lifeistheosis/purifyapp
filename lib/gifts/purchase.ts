// Plus bought by one reader for another, settled from Stripe's
// checkout.session.completed (app/api/shop/stripe-webhook/route.ts).
//
// The checkout (app/api/gifts/checkout/route.ts) puts everything the gift
// needs into the session's metadata on the server: who it is for, who gave
// it, and how many days. A buyer cannot touch metadata, and the price is the
// owner's own Stripe price, so the webhook trusts the metadata it wrote and
// checks only that the money arrived.
//
// The gift lands in the same `gifts` table an admin gift does, and the
// recipient opens it the same way (components/gifts/GiftBox.tsx). The Stripe
// session id is the idempotency key: a redelivered event finds its gift
// already written and does nothing (gifts_stripe_session_key).
//
// Database injected, so the money path is tested without one.

export type GiftSession = {
  id: string;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
};

export type GiftDb = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: { code?: string; message: string } | null }>;
  };
};

export type GiftResult = "granted" | "duplicate" | "unpaid" | "invalid" | "failed";

export const GIFT_KIND = "gift_plus";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a completed session is a gift rather than a shop order. */
export function isGiftSession(session: { metadata?: Record<string, string> | null } | null | undefined): boolean {
  return session?.metadata?.kind === GIFT_KIND;
}

/** The gift a session pays for, or null when its metadata is not one we wrote. */
export function giftOf(session: GiftSession): { recipientId: string; buyerId: string; days: number; fromName: string; fromHandle: string | null } | null {
  const m = session.metadata ?? {};
  const days = Number(m.days);
  if (m.kind !== GIFT_KIND || !UUID.test(m.recipient_id ?? "") || !UUID.test(m.buyer_id ?? "")) return null;
  if (!Number.isInteger(days) || days < 1 || days > 3650) return null;
  if (m.recipient_id === m.buyer_id) return null;
  return {
    recipientId: m.recipient_id,
    buyerId: m.buyer_id,
    days,
    fromName: (m.from_name ?? "").slice(0, 80) || "A reader",
    fromHandle: m.from_handle || null,
  };
}

export async function settleGiftSession(db: GiftDb, session: GiftSession): Promise<GiftResult> {
  // Card only (the checkout asks for nothing else), so completed means paid.
  // Anything else is not money yet and grants nothing.
  if (session.payment_status !== "paid" || !session.amount_total || session.amount_total <= 0) return "unpaid";
  const gift = giftOf(session);
  if (!gift) return "invalid";
  const { error } = await db.from("gifts").insert({
    user_id: gift.recipientId,
    tier: "plus",
    days: gift.days,
    message: null,
    from_name: gift.fromName,
    stripe_session_id: session.id,
    created_by_email: "gift:stripe",
  });
  if (error) {
    // The unique session index: this event was already settled.
    if (error.code === "23505") return "duplicate";
    return "failed";
  }
  return "granted";
}
