// A year of Plus given by email: the Christmas gift (2.0). His word,
// 2026-11-28: "yes build the gift page at 59.99". The drawing he said yes to:
// docs/plans/gift/ (https://claude.ai/artifact/FZAGa5taESXxcyMCQDrFBc).
//
// The giver fills the page on the website (/give), pays by card (Stripe), and
// the card waits in public.gift_cards until its day: then the one it is for
// gets an email with a link (/gift?code=…), signs in, and the app's own gift
// box opens it (supabase/migrations/20261128080347_gift_cards.sql).
//
// The money rules, as the shop's (lib/shop/webhookSettlement.ts, F-03): the
// price is set here on the server and nowhere else; the client sends words,
// never an amount; the webhook grants nothing unless the session was paid in
// full, in this currency, to the cent. The Stripe session id is the
// idempotency key. Pure, with the database injected, so all of it is tested.

import { randomBytes } from "node:crypto";
import { z } from "zod";

/** The gift, as he set it: a year of Plus for $59.99. */
export const GIFT_CARD = { cents: 5999, currency: "usd", days: 365 } as const;
/** How a gift card's Stripe session is told from a shop order and a reader-to-reader gift. */
export const GIFT_CARD_KIND = "gift_card";

/** When it arrives: now, Christmas Day, or the Nativity on the old calendar. */
export const GIFT_WHEN = ["now", "dec25", "jan7"] as const;
export type GiftWhen = (typeof GIFT_WHEN)[number];

const name = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1).max(60));

/** What the giver's page sends. Words only: never a price. */
export const giveSchema = z.object({
  fromName: name,
  toName: name,
  toEmail: z.string().trim().toLowerCase().pipe(z.string().email().max(254)),
  message: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(280))
    .optional()
    .transform((s) => (s ? s : null)),
  when: z.enum(GIFT_WHEN),
});
export type GiveInput = z.infer<typeof giveSchema>;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** The day in UTC, at noon, so no date moves across midnight. */
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));

/** The next 25 December or 7 January from today, today included (UTC). */
function next(monthIndex: number, day: number, now: Date): string {
  const today = utcDay(now);
  let at = new Date(Date.UTC(today.getUTCFullYear(), monthIndex, day, 12));
  if (at.getTime() < today.getTime()) at = new Date(Date.UTC(today.getUTCFullYear() + 1, monthIndex, day, 12));
  return ymd(at);
}

/** The day the email goes out, or null for as soon as it is paid. */
export function deliverOn(when: GiftWhen, now: Date): string | null {
  if (when === "dec25") return next(11, 25, now);
  if (when === "jan7") return next(0, 7, now);
  return null;
}

/**
 * The choices the page offers today: a Christmas date only in its season (from
 * 1 November) and only while it is still ahead, so no one buys a gift for a day
 * eleven months away by mistake.
 */
export function whenChoices(now: Date): GiftWhen[] {
  const today = utcDay(now);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const out: GiftWhen[] = ["now"];
  const inSeason = m >= 10 || (m === 0 && today.getUTCDate() <= 7);
  if (!inSeason) return out;
  const dec25 = new Date(Date.UTC(m === 0 ? y - 1 : y, 11, 25, 12));
  const jan7 = new Date(Date.UTC(m === 0 ? y : y + 1, 0, 7, 12));
  if (today.getTime() < dec25.getTime()) out.push("dec25");
  if (today.getTime() < jan7.getTime()) out.push("jan7");
  return out;
}

/** Whether the page is in its Christmas season (its eyebrow and line say so). */
export function christmasSeason(now: Date): boolean {
  return whenChoices(now).length > 1;
}

/** The secret in the link: 24 letters and digits, 120 bits, nothing to confuse (no 0/O, 1/I). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newGiftCode(bytes: Uint8Array = randomBytes(24)): string {
  let out = "";
  for (let i = 0; i < 24; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
export const GIFT_CODE = /^[A-HJ-NP-Z2-9]{24}$/;

/** The metadata the checkout writes on the server, which a buyer cannot touch. */
export function cardMetadata(input: GiveInput, now: Date): Record<string, string> {
  return {
    kind: GIFT_CARD_KIND,
    from_name: input.fromName,
    to_name: input.toName,
    to_email: input.toEmail,
    message: input.message ?? "",
    deliver_on: deliverOn(input.when, now) ?? "",
  };
}

export type CardSession = {
  id: string;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
};

/** Whether a completed session is a gift card rather than a shop order or a reader's gift. */
export function isGiftCardSession(session: { metadata?: Record<string, string> | null } | null | undefined): boolean {
  return session?.metadata?.kind === GIFT_CARD_KIND;
}

export type CardRow = {
  from_name: string;
  to_name: string;
  to_email: string;
  message: string | null;
  days: number;
  deliver_on: string | null;
};

/** The card a session pays for, or null when its metadata is not one we wrote. */
export function cardOf(session: CardSession): CardRow | null {
  const m = session.metadata ?? {};
  if (m.kind !== GIFT_CARD_KIND) return null;
  const parsed = giveSchema
    .omit({ when: true })
    .safeParse({ fromName: m.from_name ?? "", toName: m.to_name ?? "", toEmail: m.to_email ?? "", message: m.message ?? "" });
  if (!parsed.success) return null;
  const on = m.deliver_on ?? "";
  if (on && !/^\d{4}-\d{2}-\d{2}$/.test(on)) return null;
  return {
    from_name: parsed.data.fromName,
    to_name: parsed.data.toName,
    to_email: parsed.data.toEmail,
    message: parsed.data.message,
    days: GIFT_CARD.days,
    deliver_on: on || null,
  };
}

/** Paid in full, in this currency, to the cent. Anything else grants nothing (fail closed, as F-03). */
export function paidInFull(session: CardSession): boolean {
  return (
    session.payment_status === "paid" &&
    session.amount_total === GIFT_CARD.cents &&
    (session.currency ?? "").toLowerCase() === GIFT_CARD.currency
  );
}

export type CardDb = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => { single: () => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> };
    };
  };
};

export type SavedCard = CardRow & { id: string; code: string };
export type CardResult = { result: "saved"; card: SavedCard } | { result: "duplicate" | "unpaid" | "invalid" | "failed" };

/** Write the paid card. A redelivered event finds it written (the session id is unique) and does nothing. */
export async function settleGiftCardSession(db: CardDb, session: CardSession, code: string = newGiftCode()): Promise<CardResult> {
  if (!paidInFull(session)) return { result: "unpaid" };
  const card = cardOf(session);
  if (!card) return { result: "invalid" };
  const { data, error } = await db
    .from("gift_cards")
    .insert({
      code,
      ...card,
      amount_cents: session.amount_total,
      currency: (session.currency ?? "").toLowerCase(),
      buyer_email: session.customer_details?.email ?? null,
      stripe_session_id: session.id,
    })
    .select("id")
    .single();
  if (error) return { result: error.code === "23505" ? "duplicate" : "failed" };
  return { result: "saved", card: { ...card, id: (data as { id: string }).id, code } };
}

/** The hour of its day the email goes out: 13:00 UTC, morning in the Americas and afternoon in Europe. */
export const SEND_HOUR_UTC = 13;

/** Whether a card's email is due now. A card for "now" is due at once. */
export function cardDue(deliver: string | null, now: Date): boolean {
  if (!deliver) return true;
  const at = Date.parse(`${deliver}T${String(SEND_HOUR_UTC).padStart(2, "0")}:00:00Z`);
  return Number.isFinite(at) && now.getTime() >= at;
}

/** How many cards one hourly run sends at most; the rest go on the next. */
export const CARDS_PER_RUN = 50;
