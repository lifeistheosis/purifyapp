import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Ticket,
  TicketMessage,
  TicketStatus,
} from "./ticketNumber";

// Re-export the pure helpers so server callers can keep importing from here.
export { ticketNumber } from "./ticketNumber";
export type { Ticket, TicketMessage, TicketStatus } from "./ticketNumber";

/** Create a ticket plus its opening customer message. Service role. */
export async function createTicket(input: {
  email: string;
  name?: string | null;
  subject: string;
  body: string;
  userId?: string | null;
  orderId?: string | null;
}): Promise<Ticket | null> {
  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({
      email: input.email,
      name: input.name ?? null,
      subject: input.subject,
      user_id: input.userId ?? null,
      order_id: input.orderId ?? null,
      status: "open",
    })
    .select("*")
    .single();
  if (error || !ticket) {
    console.warn("[support] ticket insert failed", error?.message);
    return null;
  }
  await admin.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    author: "customer",
    body: input.body,
  });
  return ticket as Ticket;
}

/**
 * A conversation the admin starts, from an order's page (the owner's r3-16
 * Orders pick: Reply beside every order). The opening message is staff's,
 * and the ticket starts as waiting on the reader. The address is the order's,
 * passed in by the route after reading the order, never one typed in.
 * Service role.
 */
export async function startStaffThread(input: {
  email: string;
  name: string | null;
  userId: string | null;
  orderId: string;
  subject: string;
  body: string;
}): Promise<Ticket | null> {
  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({
      email: input.email,
      name: input.name,
      subject: input.subject,
      user_id: input.userId,
      order_id: input.orderId,
      status: "pending",
    })
    .select("*")
    .single();
  if (error || !ticket) {
    console.warn("[support] staff thread insert failed", error?.message);
    return null;
  }
  const { error: msgErr } = await admin
    .from("support_ticket_messages")
    .insert({ ticket_id: ticket.id, author: "staff", body: input.body });
  if (msgErr) {
    console.warn("[support] staff thread message insert failed", msgErr.message);
    return null;
  }
  return ticket as Ticket;
}

/** Append a staff reply and reopen/bump the ticket. Returns the ticket so the
 *  caller can email the customer. Service role. */
export async function addStaffReply(
  ticketId: string,
  body: string,
): Promise<Ticket | null> {
  const admin = createAdminClient();
  const { error: msgErr } = await admin
    .from("support_ticket_messages")
    .insert({ ticket_id: ticketId, author: "staff", body });
  if (msgErr) {
    console.warn("[support] staff reply insert failed", msgErr.message);
    return null;
  }
  const { data: ticket } = await admin
    .from("support_tickets")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("*")
    .maybeSingle();
  return (ticket as Ticket) ?? null;
}

export async function setTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  return !error;
}

/** All tickets for the admin console, newest activity first. Service role.
 *  Selects the reaction column when present, and transparently falls back
 *  to the pre-reaction shape if the 20260718 migration isn't applied yet,
 *  so the console never breaks on a missing column. */
export async function listTickets(
  status?: TicketStatus,
): Promise<(Ticket & { messages: TicketMessage[] })[]> {
  const admin = createAdminClient();

  // Primary select includes the reaction column.
  const withReaction = admin
    .from("support_tickets")
    .select(
      "*, messages:support_ticket_messages(id, author, body, created_at, reaction)",
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  let res = await (status ? withReaction.eq("status", status) : withReaction);

  // Fallback for before the 20260718 migration is applied: retry without
  // the reaction column so the console never breaks on a missing column.
  if (res.error) {
    const plain = admin
      .from("support_tickets")
      .select("*, messages:support_ticket_messages(id, author, body, created_at)")
      .order("updated_at", { ascending: false })
      .limit(200);
    res = (await (status
      ? plain.eq("status", status)
      : plain)) as typeof res;
  }

  const { data, error } = res;
  if (error || !data) return [];
  return (data as unknown as (Ticket & { messages?: TicketMessage[] })[]).map(
    (t) => ({
      ...(t as Ticket),
      messages: (t.messages ?? []).sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      ),
    }),
  );
}

/** Toggle a reaction on a support message (admin double-tap to heart).
 *  Passing an empty/undefined reaction clears it. Service role. */
export async function setMessageReaction(
  messageId: string,
  reaction: string | null,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("support_ticket_messages")
    .update({ reaction: reaction || null })
    .eq("id", messageId);
  return !error;
}

/**
 * A customer's answer that came in by email (1.8): a reply to "Re: your
 * request TKT-…" names its ticket in the subject, so it joins that ticket
 * and reopens it. Null when no ticket with that number exists. Service role.
 */
export async function addCustomerReplyByNumber(num: string, body: string): Promise<Ticket | null> {
  const hex = /^TKT-([0-9A-F]{8})$/i.exec(num)?.[1]?.toLowerCase();
  if (!hex) return null;
  const admin = createAdminClient();
  // The number is the id's first eight characters, so the ticket is the one
  // id in that range.
  const { data: found } = await admin
    .from("support_tickets")
    .select("*")
    .gte("id", `${hex}-0000-0000-0000-000000000000`)
    .lte("id", `${hex}-ffff-ffff-ffff-ffffffffffff`)
    .limit(1)
    .maybeSingle();
  if (!found) return null;
  const { error } = await admin
    .from("support_ticket_messages")
    .insert({ ticket_id: (found as Ticket).id, author: "customer", body });
  if (error) {
    console.warn("[support] emailed reply insert failed", error.message);
    return null;
  }
  const { data: ticket } = await admin
    .from("support_tickets")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", (found as Ticket).id)
    .select("*")
    .maybeSingle();
  return (ticket as Ticket) ?? null;
}
