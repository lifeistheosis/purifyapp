import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  conversationUnread,
  inboxRows,
  markTicketSeen,
  readTicketSeen,
  ticketUnread,
  type InboxConversation,
  type InboxLast,
  type InboxTicket,
} from "@/lib/shop/inbox";

/**
 * Messages A, "The order beside the thread" (r3-19, the owner's pick of
 * 2026-10-31). What a reader would see if this broke: an inbox of subjects
 * with nothing of who wrote last or what they said (build 85); the owner's
 * replies from his console missing from the app, or every old one lit as new
 * the day this ships; their own last words not marked as theirs.
 *
 * Every reader, store and message here is SAMPLE (the repo is public).
 */

const EIKON = { public_name: "EIKON", slug: "eikon" };
const STUDIO = { public_name: "Sample Icon Studio", slug: "sample-icon-studio" };

const conv = (over: Partial<InboxConversation>): InboxConversation => ({
  id: "c1",
  subject: "Order · Byzantine wall cross",
  status: "open",
  order_id: null,
  last_message_at: "2026-10-30T14:12:00Z",
  buyer_last_read_at: "2026-10-29T22:03:00Z",
  store: EIKON,
  ...over,
});

const ticket = (over: Partial<InboxTicket>): InboxTicket => ({
  id: "t1",
  subject: "Your prayer rope is on its way",
  status: "resolved",
  order_id: "o2",
  created_at: "2026-10-27T15:10:00Z",
  updated_at: "2026-10-27T15:10:00Z",
  messages: [{ author: "staff", body: "Your prayer rope left us today with USPS.", created_at: "2026-10-27T15:10:00Z" }],
  ...over,
});

const SEEN_NEVER = { since: "2026-10-01T00:00:00Z", at: {} };

describe("the inbox", () => {
  it("says who wrote last and what, the reader's own as theirs, the most recent first", () => {
    const last: InboxLast[] = [
      { conversation_id: "c1", sender: "buyer", body: "Will it reach me before November 8?", created_at: "2026-10-29T22:02:00Z" },
      { conversation_id: "c1", sender: "seller", body: "It should ship this week.", created_at: "2026-10-30T14:12:00Z" },
      { conversation_id: "c2", sender: "buyer", body: "Thank you!", created_at: "2026-10-12T19:30:00Z" },
    ];
    const rows = inboxRows(
      [
        conv({ id: "c2", subject: "Support", last_message_at: "2026-10-12T19:30:00Z", buyer_last_read_at: "2026-10-12T19:31:00Z" }),
        conv({ id: "c1", order_id: "o1" }),
        conv({ id: "c3", subject: "Commission", status: "closed", store: STUDIO, last_message_at: "2026-09-20T17:44:00Z", buyer_last_read_at: "2026-09-21T10:00:00Z" }),
      ],
      last,
      [ticket({})],
      SEEN_NEVER,
    );
    expect(rows.map((r) => [r.id, r.preview, r.mine])).toEqual([
      ["c1", "It should ship this week.", false],
      ["t1", "Your prayer rope left us today with USPS.", false],
      ["c2", "Thank you!", true],
      ["c3", null, false],
    ]);
    expect(rows[0]).toMatchObject({ seal: true, unread: true, orderId: "o1", href: "/shop/messages/detail?id=c1" });
    expect(rows[3]).toMatchObject({ name: "Sample Icon Studio", seal: false, closed: true, unread: false });
  });

  it("brings the console's replies in as support threads: EIKON's about an order, Purify's otherwise", () => {
    const rows = inboxRows([], [], [ticket({}), ticket({ id: "t2", order_id: null, subject: "The app will not open" })], SEEN_NEVER);
    expect(rows.find((r) => r.id === "t1")).toMatchObject({
      kind: "ticket",
      name: "EIKON",
      seal: true,
      support: true,
      href: "/shop/messages/detail?ticket=t1",
      orderId: "o2",
    });
    expect(rows.find((r) => r.id === "t2")).toMatchObject({ name: "Purify", support: true, orderId: null });
  });

  it("dates a ticket by its last message, not by a status change in the console", () => {
    const rows = inboxRows([], [], [ticket({ updated_at: "2026-10-31T09:00:00Z" })], SEEN_NEVER);
    expect(rows[0].at).toBe("2026-10-27T15:10:00Z");
  });
});

describe("what is unread", () => {
  it("lights a conversation with something after the reader last read it", () => {
    expect(conversationUnread(conv({}))).toBe(true);
    expect(conversationUnread(conv({ buyer_last_read_at: "2026-10-30T14:13:00Z" }))).toBe(false);
    expect(conversationUnread(conv({ buyer_last_read_at: null }))).toBe(true);
  });

  it("lights a ticket the console answered after it was last opened here, never one older than this device's record", () => {
    // Answered before the record began: the reader already had it by email.
    expect(ticketUnread(ticket({}), { since: "2026-10-31T00:00:00Z", at: {} })).toBe(false);
    // Answered after: lit until it is opened here.
    expect(ticketUnread(ticket({}), SEEN_NEVER)).toBe(true);
    expect(ticketUnread(ticket({}), { since: SEEN_NEVER.since, at: { t1: "2026-10-27T15:10:00Z" } })).toBe(false);
    // The reader's own answer is never unread.
    expect(ticketUnread(ticket({ messages: [{ author: "customer", body: "Thanks", created_at: "2026-10-28T10:00:00Z" }] }), SEEN_NEVER)).toBe(false);
  });
});

describe("the device's record of opened tickets", () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts from the first time it is asked, and keeps each ticket's last look", () => {
    const first = readTicketSeen("2026-10-31T15:00:00Z");
    expect(first).toEqual({ since: "2026-10-31T15:00:00Z", at: {} });
    // Asked again later, it keeps the day it began.
    expect(readTicketSeen("2026-11-02T08:00:00Z").since).toBe("2026-10-31T15:00:00Z");
    markTicketSeen("t1", "2026-11-01T10:00:00Z");
    expect(readTicketSeen("2026-11-02T08:00:00Z").at).toEqual({ t1: "2026-11-01T10:00:00Z" });
  });

  it("lights nothing when the browser keeps nothing (a private window)", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });
    const seen = readTicketSeen("2026-10-31T15:00:00Z");
    expect(ticketUnread(ticket({}), seen)).toBe(false);
    expect(() => markTicketSeen("t1", "2026-10-31T15:00:00Z")).not.toThrow();
  });
});
