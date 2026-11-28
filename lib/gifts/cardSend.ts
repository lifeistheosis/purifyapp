import "server-only";

// Sending a gift card's email (2.0, the Christmas gift; lib/gifts/card.ts).
//
// Through the email ledger, once per card (lib/email/ledger.ts, sendEmailOnce,
// the one way an email reaches Resend): its key is gift_card:<card id>, so the
// webhook's send (a card for "now") and the hourly run's (a card whose day has
// come) never both go. A card is marked sent once its email has gone; a send
// that failed leaves it unmarked, and the next hourly run tries again, which
// the ledger allows for a failed key.

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmailOnce } from "@/lib/email/ledger";
import { CARDS_PER_RUN, cardDue } from "@/lib/gifts/card";
import { giftCardEmail, type GiftCardLetter } from "@/lib/gifts/cardEmail";

export type CardToSend = GiftCardLetter & { id: string; to_email: string };
export type SendOutcome = "sent" | "already" | "failed";

export async function sendGiftCard(admin: SupabaseClient, card: CardToSend, now: Date = new Date()): Promise<SendOutcome> {
  const mail = giftCardEmail(card);
  const r = await sendEmailOnce(admin, {
    dedupeKey: `gift_card:${card.id}`,
    kind: "gift_card",
    userId: null,
    to: card.to_email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  if (r.status !== "sent" && r.status !== "duplicate") return "failed";
  await admin.from("gift_cards").update({ sent_at: now.toISOString() }).eq("id", card.id).is("sent_at", null);
  return r.status === "sent" ? "sent" : "already";
}

/** The hourly run's share: every paid card whose day has come, not yet sent. */
export async function sendDueGiftCards(admin: SupabaseClient, now: Date = new Date()): Promise<{ due: number; sent: number; failed: number }> {
  const today = now.toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("gift_cards")
    .select("id, code, from_name, to_name, to_email, message, deliver_on")
    .is("sent_at", null)
    .or(`deliver_on.is.null,deliver_on.lte.${today}`)
    .order("paid_at", { ascending: true })
    .limit(CARDS_PER_RUN);
  if (error || !data) return { due: 0, sent: 0, failed: 0 };
  const due = (data as (CardToSend & { deliver_on: string | null })[]).filter((c) => cardDue(c.deliver_on, now));
  let sent = 0;
  let failed = 0;
  for (const card of due) {
    const outcome = await sendGiftCard(admin, card, now);
    if (outcome === "sent") sent++;
    if (outcome === "failed") failed++;
  }
  return { due: due.length, sent, failed };
}
