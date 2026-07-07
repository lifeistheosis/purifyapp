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

/** All tickets for the admin console, newest activity first. Service role. */
export async function listTickets(
  status?: TicketStatus,
): Promise<(Ticket & { messages: TicketMessage[] })[]> {
  const admin = createAdminClient();
  let query = admin
    .from("support_tickets")
    .select("*, messages:support_ticket_messages(id, author, body, created_at)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((t) => ({
    ...(t as Ticket),
    messages: (
      (t as { messages?: TicketMessage[] }).messages ?? []
    ).sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
}
