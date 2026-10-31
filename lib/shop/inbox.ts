/**
 * The shop's inbox for a buyer, Messages A, "The order beside the thread"
 * (r3-19, the owner's pick of 2026-10-31): who wrote last and what they said,
 * the order's piece beside it, unread lit. His own replies from the support
 * console (support_tickets, the console's Reply and Send tracking) come into
 * the same list as threads of their own; until 1.8 they reached the reader
 * by email only, though the reader could already read them under
 * support_tickets_owner_select.
 *
 * Every row is read on the device under the reader's own policies. Pure but
 * for the small record of which tickets were opened on this device, kept in
 * the browser's storage (a ticket has no read mark of its own, and none is
 * added: no migration).
 */

export type InboxConversation = {
  id: string;
  subject: string;
  status: "open" | "closed";
  order_id: string | null;
  last_message_at: string;
  buyer_last_read_at: string | null;
  store: { public_name: string; slug?: string | null } | null;
};

/** The latest message of a conversation, as one read of shop_messages returns it. */
export type InboxLast = {
  conversation_id: string;
  sender: "buyer" | "seller";
  body: string;
  created_at: string;
};

export type InboxTicket = {
  id: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed";
  order_id: string | null;
  created_at: string;
  updated_at: string;
  messages: { author: "customer" | "staff"; body: string; created_at: string }[];
};

export type InboxRow = {
  kind: "conversation" | "ticket";
  id: string;
  href: string;
  /** Who it is with: the store's name; a ticket is EIKON's when it is about an order, else Purify's. */
  name: string;
  /** Wears a seal (EIKON's, or Purify's on a ticket) rather than a seller's initial. */
  seal: boolean;
  /** A support ticket, marked as such beside the name. */
  support: boolean;
  title: string;
  closed: boolean;
  /** The last thing said, or null when it could not be read. */
  preview: string | null;
  /** The reader said it ("You: …"). */
  mine: boolean;
  /** When it last moved. */
  at: string;
  unread: boolean;
  orderId: string | null;
};

/** A ticket's store of what was opened here: since when it has been kept, and each ticket's last look. */
export type TicketSeen = { since: string; at: Record<string, string> };

const SEEN_KEY = "purify:shop:ticket-seen";

/**
 * What this device has opened. The first time it is asked it starts from
 * now, so the tickets a reader already had by email do not all light up the
 * day this ships; a reply after that lights until its thread is opened here.
 */
export function readTicketSeen(now: string): TicketSeen {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<TicketSeen>) : null;
    if (parsed && typeof parsed.since === "string" && parsed.at && typeof parsed.at === "object") {
      return { since: parsed.since, at: parsed.at as Record<string, string> };
    }
    const fresh = { since: now, at: {} };
    localStorage.setItem(SEEN_KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    // No storage (a private window): nothing is lit rather than everything.
    return { since: now, at: {} };
  }
}

/** Remember that this ticket was opened here, up to its newest message. */
export function markTicketSeen(id: string, at: string): void {
  try {
    const seen = readTicketSeen(at);
    seen.at[id] = at;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* nothing to keep it in */
  }
}

const later = (a: string, b: string) => (Date.parse(a) >= Date.parse(b) ? a : b);

/** A ticket is unread when the console answered after it was last opened here. */
export function ticketUnread(t: InboxTicket, seen: TicketSeen): boolean {
  const staff = t.messages.filter((m) => m.author === "staff").map((m) => m.created_at);
  if (!staff.length) return false;
  const newest = staff.reduce(later);
  const looked = seen.at[t.id] ? later(seen.at[t.id], seen.since) : seen.since;
  return Date.parse(newest) > Date.parse(looked);
}

/** A conversation is unread when something came after the reader last read it. */
export function conversationUnread(c: Pick<InboxConversation, "buyer_last_read_at" | "last_message_at">): boolean {
  if (!c.buyer_last_read_at) return true;
  return Date.parse(c.last_message_at) > Date.parse(c.buyer_last_read_at);
}

/** Every thread, the most recently moved first. */
export function inboxRows(
  conversations: readonly InboxConversation[],
  lastMessages: readonly InboxLast[],
  tickets: readonly InboxTicket[],
  seen: TicketSeen,
): InboxRow[] {
  const latest = new Map<string, InboxLast>();
  for (const m of lastMessages) {
    const had = latest.get(m.conversation_id);
    if (!had || Date.parse(m.created_at) > Date.parse(had.created_at)) latest.set(m.conversation_id, m);
  }
  const rows: InboxRow[] = conversations.map((c) => {
    const last = latest.get(c.id) ?? null;
    const name = c.store?.public_name ?? "EIKON";
    return {
      kind: "conversation",
      id: c.id,
      href: `/shop/messages/detail?id=${c.id}`,
      name,
      seal: c.store?.slug ? c.store.slug === "eikon" : name === "EIKON",
      support: false,
      title: c.subject,
      closed: c.status === "closed",
      preview: last?.body ?? null,
      mine: last?.sender === "buyer",
      at: c.last_message_at,
      unread: conversationUnread(c),
      orderId: c.order_id,
    };
  });
  for (const t of tickets) {
    const ordered = [...t.messages].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const last = ordered[ordered.length - 1] ?? null;
    rows.push({
      kind: "ticket",
      id: t.id,
      href: `/shop/messages/detail?ticket=${t.id}`,
      name: t.order_id ? "EIKON" : "Purify",
      seal: true,
      support: true,
      title: t.subject,
      closed: t.status === "closed",
      preview: last?.body ?? null,
      mine: last?.author === "customer",
      // When it was last written in: a status change in the console moves updated_at, not the thread.
      at: last?.created_at ?? t.updated_at,
      unread: ticketUnread(t, seen),
      orderId: t.order_id,
    });
  }
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
