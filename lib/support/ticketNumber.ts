// Pure helpers + types, safe to import from client and server (no server-only
// dependency). The service-role logic lives in ./tickets.

/** Human-friendly ticket number derived from the ticket UUID (no column). */
export function ticketNumber(ticketId: string): string {
  return `TKT-${ticketId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export type TicketStatus = "open" | "pending" | "resolved" | "closed";

export type TicketMessage = {
  id: string;
  author: "customer" | "staff";
  body: string;
  created_at: string;
  /** Optional reaction emoji (double-tap to heart). Absent until the
   * 20260718 migration is applied. */
  reaction?: string | null;
};

export type Ticket = {
  id: string;
  email: string;
  name: string | null;
  subject: string;
  status: TicketStatus;
  order_id: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};
